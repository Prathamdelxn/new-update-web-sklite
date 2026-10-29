'use client';

// =============================================================================
// Sky-Lite Web — Client Public Requirement Intake & Wishlist Portal
// Allows clients to self-fill their room requirements, style preferences & budget.
// If already submitted, shows ONLY the confirmed submission screen with summary
// and studio contact details, hiding the input form completely.
// =============================================================================

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
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
  Briefcase,
  Utensils,
  Store,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  Sliders,
  Sun,
  Clock,
  ArrowRight,
  Edit3,
  X,
} from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { cn } from '@/lib/utils';

export interface ClientRoomRequirement {
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

const QUICK_BUDGET_PRESETS = [
  '₹3L - ₹5L',
  '₹5L - ₹10L',
  '₹10L - ₹15L',
  '₹15L - ₹25L',
  '₹25L - ₹50L',
  '₹50L+',
];

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

const DEFAULT_ROOM: ClientRoomRequirement = {
  roomName: '',
  interiorType: 'Residential',
  roomUsage: '',
  furnitureRequirements: '',
  storage: '',
  electricalPoints: '',
  lightingRequirements: '',
  plumbingRequirements: '',
  circulation: '',
  designStyle: 'Modern Minimalist',
  colours: '',
  materials: '',
  flooring: '',
  ceiling: '',
  wallFinishes: '',
  furnitureStyle: '',
  description: '',
  theme: '',
};

export default function ClientRequirementSharePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params?.token as string;
  const isDirectEditMode = searchParams?.get('edit') === 'true' || searchParams?.get('mode') === 'edit';

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portalData, setPortalData] = useState<any>(null);

  // Form state
  const [rooms, setRooms] = useState<ClientRoomRequirement[]>([]);
  const [overallBudget, setOverallBudget] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [submittedSuccessfully, setSubmittedSuccessfully] = useState(false);
  const [isEditingForm, setIsEditingForm] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [collapsedRooms, setCollapsedRooms] = useState<{ [key: number]: boolean }>({});
  const [activeSubTab, setActiveSubTab] = useState<{ [key: number]: 'functional' | 'aesthetic' | 'notes' }>({});

  const getSubTab = (index: number) => activeSubTab[index] || 'functional';
  const setSubTab = (index: number, tab: 'functional' | 'aesthetic' | 'notes') => {
    setActiveSubTab((prev) => ({ ...prev, [index]: tab }));
  };

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

        const isAlreadySubmitted = Boolean(
          res.data.clientRequirementsSubmittedAt ||
          (Array.isArray(existingClientReqs) && existingClientReqs.length > 0)
        );

        if (Array.isArray(existingClientReqs) && existingClientReqs.length > 0) {
          setRooms(existingClientReqs.map((r: any) => ({ ...DEFAULT_ROOM, ...r })));
        } else if (Array.isArray(fallbackTeamReqs) && fallbackTeamReqs.length > 0) {
          setRooms(fallbackTeamReqs.map((r: any) => ({ ...DEFAULT_ROOM, ...r })));
        } else {
          setRooms([
            { ...DEFAULT_ROOM, roomName: 'Living Room' },
            { ...DEFAULT_ROOM, roomName: 'Master Bedroom' },
          ]);
        }

        if (isAlreadySubmitted) {
          setSubmittedSuccessfully(true);
          if (isDirectEditMode) {
            setIsEditingForm(true);
          }
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

  const handleSubmit = (e: React.FormEvent) => {
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

    // Open confirmation modal for review before final submission
    setIsConfirmModalOpen(true);
  };

  const executeSubmit = async () => {
    try {
      setIsSubmitting(true);
      const res = await interiorCrmService.submitClientRequirements(token, {
        requirements: rooms,
        notes: generalNotes,
        budgetRange: overallBudget,
      });

      if (res?.success) {
        // Notify any open CRM lead tabs immediately across windows/tabs
        const leadId = portalData?.lead?._id || portalData?.lead?.id;
        try {
          if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const channel = new BroadcastChannel('crm_requirement_channel');
            channel.postMessage({
              type: 'REQUIREMENT_SUBMITTED',
              token,
              leadId,
              timestamp: Date.now(),
            });
            setTimeout(() => {
              try {
                channel.close();
              } catch {}
            }, 1000);
          }
        } catch (e) {
          console.warn('BroadcastChannel sync error:', e);
        }

        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(
              'crm_requirement_sync',
              JSON.stringify({
                type: 'REQUIREMENT_SUBMITTED',
                token,
                leadId,
                timestamp: Date.now(),
              })
            );
          }
        } catch (e) {
          console.warn('localStorage sync error:', e);
        }

        setIsConfirmModalOpen(false);
        setSubmittedSuccessfully(true);
        setIsEditingForm(false);
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
  const isFilled = submittedSuccessfully && !isEditingForm;

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
            {isFilled && (
              <button
                type="button"
                onClick={() => {
                  setIsEditingForm(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Edit and modify previously submitted requirements"
              >
                <Edit3 size={13} />
                <span>Edit Requirements</span>
              </button>
            )}
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
              <ShieldCheck size={13} /> Verified Portal
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6 flex-1">
        {/* ── CASE 1: REQUIREMENTS ALREADY SUBMITTED (SHOW CONFIRMATION ONLY, HIDE FORM) ── */}
        {isFilled ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 text-center flex flex-col items-center space-y-6 shadow-xs">
              {/* Celebratory Icon */}
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-inner">
                  <CheckCircle2 size={44} className="text-emerald-600 animate-in zoom-in-75 duration-300" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow-xs">
                  <Sparkles size={13} />
                </div>
              </div>

              {/* Main Heading & Message */}
              <div className="max-w-xl space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider">
                  <Check size={13} />
                  Requirements Received
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Thank You, {lead.name || 'Client'}!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
                  Your interior requirements & wishlist have been recorded. Our design team is currently reviewing your preferences to prepare your 2D layout drawings and 3D visual concepts.
                </p>
              </div>

              {/* Prominent Edit / Modification Callout */}
              <div className="w-full max-w-3xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap text-left shadow-2xs">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Edit3 size={18} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-2 flex-wrap">
                      <span>Previously Submitted Brief Loaded</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {rooms.length} Space{rooms.length === 1 ? '' : 's'} Configured
                      </span>
                    </h4>
                    <p className="text-xs text-amber-800/90 leading-relaxed mt-1">
                      Your preferences & room specifications are loaded below. Want to change anything or add more rooms? Click <strong>Edit Requirements</strong> to open the full editor.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditingForm(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                >
                  <Edit3 size={14} />
                  <span>Edit Requirements</span>
                </button>
              </div>

              {/* Submission Summary Card */}
              <div className="w-full max-w-3xl bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-6 text-left space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submission Overview</span>
                  {portalData?.clientRequirementsSubmittedAt && (
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Calendar size={12} className="text-emerald-600" />
                      {new Date(portalData.clientRequirementsSubmittedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Configured Spaces</span>
                    <p className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <Layers size={14} className="text-emerald-600" />
                      {rooms.length} {rooms.length === 1 ? 'Space' : 'Spaces'}
                    </p>
                  </div>

                  {(overallBudget || lead.budgetRange) && (
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Target Budget Range</span>
                      <p className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                        <DollarSign size={14} className="text-amber-500" />
                        {overallBudget || lead.budgetRange}
                      </p>
                    </div>
                  )}
                </div>

                {/* General Directives (if provided) */}
                {generalNotes && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Special Directives & Notes:</span>
                    <p className="text-slate-700 italic leading-relaxed">
                      &ldquo;{generalNotes}&rdquo;
                    </p>
                  </div>
                )}

                {/* Detailed Room Specifications List */}
                {rooms.length > 0 && (
                  <div className="space-y-3.5 pt-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers size={13} className="text-emerald-600" /> Detailed Room Specifications
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">{rooms.length} Area(s)</span>
                    </div>

                    <div className="space-y-3.5">
                      {rooms.map((r, i) => (
                        <div
                          key={i}
                          className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:border-slate-300 transition-all"
                        >
                          {/* Room Header */}
                          <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {i + 1}
                              </span>
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900">{r.roomName}</h4>
                              {r.interiorType && (
                                <span className="text-[10px] text-slate-500">({r.interiorType})</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {r.designStyle && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold">
                                  <Palette size={10} /> {r.designStyle}
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingForm(true);
                                  setCollapsedRooms((prev) => ({ ...prev, [i]: false }));
                                  window.scrollTo({ top: 120, behavior: 'smooth' });
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                                title="Edit this space"
                              >
                                <Edit3 size={11} /> Edit Space
                              </button>
                            </div>
                          </div>

                          {/* Room Details Body */}
                          <div className="p-3.5 sm:p-4 space-y-3 text-xs">
                            {/* Dual Section Grid: Functional Requirements vs Aesthetic Requirements */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                              {/* 1. Functional Requirements Card */}
                              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 space-y-2 min-w-0">
                                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                                    <Sliders size={11} /> Functional Requirements
                                  </span>
                                  {(r.roomUsage || r.furnitureRequirements || r.storage || r.electricalPoints || r.lightingRequirements || r.plumbingRequirements || r.circulation) ? (
                                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                      Specified
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-400">Not specified</span>
                                  )}
                                </div>

                                {r.roomUsage && (
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Usage / Purpose</span>
                                    <span className="font-semibold text-slate-800 break-words mt-0.5 block">{r.roomUsage}</span>
                                  </div>
                                )}

                                {r.furnitureRequirements && (
                                  <div className="p-2 rounded-lg bg-white border border-slate-200 min-w-0">
                                    <span className="text-[9px] font-bold uppercase text-slate-400 flex items-center gap-1 mb-0.5">
                                      <Armchair size={10} className="text-emerald-600" /> Furniture & Fixtures
                                    </span>
                                    <p className="font-semibold text-slate-800 leading-relaxed break-words text-xs">
                                      {r.furnitureRequirements}
                                    </p>
                                  </div>
                                )}

                                {r.storage && (
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Storage Units</span>
                                    <span className="font-medium text-slate-800 break-words mt-0.5 block">{r.storage}</span>
                                  </div>
                                )}

                                {r.electricalPoints && (
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-bold text-amber-600 uppercase flex items-center gap-1">
                                      <Zap size={10} /> Electrical / MEP
                                    </span>
                                    <span className="font-medium text-slate-800 break-words mt-0.5 block">{r.electricalPoints}</span>
                                  </div>
                                )}

                                {r.lightingRequirements && (
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-bold text-amber-600 uppercase flex items-center gap-1">
                                      <Sun size={10} /> Lighting Requirements
                                    </span>
                                    <span className="font-medium text-slate-800 break-words mt-0.5 block">{r.lightingRequirements}</span>
                                  </div>
                                )}

                                {r.plumbingRequirements && (
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-bold text-blue-600 uppercase flex items-center gap-1">
                                      <Droplets size={10} /> Plumbing
                                    </span>
                                    <span className="font-medium text-slate-800 break-words mt-0.5 block">{r.plumbingRequirements}</span>
                                  </div>
                                )}

                                {r.circulation && (
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Circulation & Clearance</span>
                                    <span className="font-medium text-slate-800 break-words mt-0.5 block">{r.circulation}</span>
                                  </div>
                                )}

                                {!(r.roomUsage || r.furnitureRequirements || r.storage || r.electricalPoints || r.lightingRequirements || r.plumbingRequirements || r.circulation) && (
                                  <p className="text-[11px] text-slate-400 italic py-1">No functional requirements specified.</p>
                                )}
                              </div>

                              {/* 2. Aesthetic Requirements Card */}
                              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 space-y-2 min-w-0">
                                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                                    <Palette size={11} /> Aesthetic Requirements
                                  </span>
                                  {(r.designStyle || r.theme || r.colours || r.materials || r.flooring || r.ceiling || r.wallFinishes || r.furnitureStyle) ? (
                                    <span className="text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded">
                                      Specified
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-400">Not specified</span>
                                  )}
                                </div>

                                {(r.designStyle || r.theme) && (
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Design Style</span>
                                    <span className="font-bold text-purple-700 break-words mt-0.5 block">{r.designStyle || r.theme}</span>
                                  </div>
                                )}

                                {r.theme && r.designStyle && r.theme !== r.designStyle && (
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Theme / Mood</span>
                                    <span className="font-semibold text-slate-800 break-words mt-0.5 block">{r.theme}</span>
                                  </div>
                                )}

                                {r.colours && (
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Colours & Palette</span>
                                    <span className="font-medium text-slate-800 break-words mt-0.5 block">{r.colours}</span>
                                  </div>
                                )}

                                {r.materials && (
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Materials & Finishes</span>
                                    <span className="font-medium text-slate-800 break-words mt-0.5 block">{r.materials}</span>
                                  </div>
                                )}

                                {r.flooring && (
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Flooring Preferences</span>
                                    <span className="font-medium text-slate-800 break-words mt-0.5 block">{r.flooring}</span>
                                  </div>
                                )}

                                {r.ceiling && (
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Ceiling & False Ceiling</span>
                                    <span className="font-medium text-slate-800 break-words mt-0.5 block">{r.ceiling}</span>
                                  </div>
                                )}

                                {r.wallFinishes && (
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Wall Finishes & Paneling</span>
                                    <span className="font-medium text-slate-800 break-words mt-0.5 block">{r.wallFinishes}</span>
                                  </div>
                                )}

                                {r.furnitureStyle && (
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Furniture Style</span>
                                    <span className="font-medium text-slate-800 break-words mt-0.5 block">{r.furnitureStyle}</span>
                                  </div>
                                )}

                                {!(r.designStyle || r.theme || r.colours || r.materials || r.flooring || r.ceiling || r.wallFinishes || r.furnitureStyle) && (
                                  <p className="text-[11px] text-slate-400 italic py-1">No aesthetic requirements recorded.</p>
                                )}
                              </div>
                            </div>

                            {/* Room Notes / Description */}
                            {r.description && (
                              <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 text-xs space-y-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                  <Sparkles size={10} className="text-amber-500" /> Space Observations & Preferences:
                                </span>
                                <p className="text-slate-700 italic leading-relaxed">
                                  &ldquo;{r.description}&rdquo;
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action / Next Steps Buttons */}
              <div className="flex items-center gap-3 flex-wrap justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingForm(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Edit3 size={14} />
                  <span>Edit My Requirements</span>
                </button>

                {org.phone && (
                  <a
                    href={`https://wa.me/${org.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Hi ${org.name || 'Team'}, I have submitted my interior requirements for ${lead.name || 'our home'}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <MessageSquare size={14} />
                    <span>Chat on WhatsApp</span>
                  </a>
                )}

                {org.phone && (
                  <a
                    href={`tel:${org.phone}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <Phone size={14} className="text-emerald-600" />
                    <span>Call Design Studio</span>
                  </a>
                )}

                {hasDrawings && (
                  <a
                    href={`/share/drawing/${token}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Eye size={14} />
                    <span>View Shared Drawings</span>
                  </a>
                )}
              </div>

              {/* Optional link if they ever want to edit */}
              <div className="pt-2 border-t border-slate-100 w-full max-w-sm flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingForm(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 size={13} />
                  <span>Click here to open editor & update your requirements</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── CASE 2: FORM (SHOWN WHEN NOT YET SUBMITTED OR WHEN ACTIVELY EDITING) ── */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* If in edit mode, show a top banner with Cancel button */}
            {isEditingForm ? (
              <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 gap-3 flex-wrap shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                    <Edit3 size={16} />
                  </div>
                  <div>
                    <span className="font-bold block text-amber-950">Editing Previously Submitted Requirements</span>
                    <span className="text-[11px] text-amber-800">All your previously saved space specifications are pre-filled below. Review, make your updates, and click <strong>&ldquo;Update My Requirements&rdquo;</strong> to save.</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingForm(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-amber-300 rounded-xl font-bold text-amber-900 cursor-pointer shadow-2xs text-xs shrink-0 transition-colors"
                >
                  Cancel & View Summary
                </button>
              </div>
            ) : (
              /* Banner greeting */
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
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
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
                          "text-xs px-2.5 py-1 rounded-lg border font-medium transition-all active:scale-95 flex items-center gap-1 cursor-pointer",
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

              {/* Overall Project Scope & Estimated Budget */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    <DollarSign size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Target Estimated Budget
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Your comfortable budget or target range for this complete interior work.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text"
                      value={overallBudget}
                      onChange={(e) => setOverallBudget(e.target.value)}
                      placeholder="e.g. ₹5L - ₹10L or ₹15,00,000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  {/* Quick Budget Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] font-bold text-slate-400 mr-1">Quick Presets:</span>
                    {QUICK_BUDGET_PRESETS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setOverallBudget(chip)}
                        className={cn(
                          "text-[10px] font-bold px-2.5 py-1 rounded-xl border transition-all cursor-pointer active:scale-95",
                          overallBudget === chip
                            ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:border-amber-500/50 hover:text-slate-900"
                        )}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Configured Rooms List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} className="text-emerald-600" />
                    Configured Spaces ({rooms.length})
                  </h3>
                  <span className="text-[11px] text-slate-500">Customize specifications for each room</span>
                </div>

                {rooms.map((room, idx) => {
                  const currentSubTab = getSubTab(idx);
                  const isCollapsed = collapsedRooms[idx] ?? false;

                  return (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden shadow-2xs transition-all"
                    >
                      {/* Room Card Header */}
                      <div className="px-4 sm:px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {idx + 1}
                          </div>
                          <input
                            type="text"
                            value={room.roomName}
                            onChange={(e) => updateRoomField(idx, 'roomName', e.target.value)}
                            placeholder="Space Name (e.g. Master Bedroom, Living Room) *"
                            className="font-bold text-xs sm:text-sm text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white px-1 py-0.5 rounded outline-none transition-all flex-1 min-w-[140px]"
                            required
                          />

                          {room.interiorType && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 hidden sm:inline-block">
                              {room.interiorType}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => duplicateRoom(idx)}
                            title="Duplicate Space"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors text-xs cursor-pointer"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRoom(idx)}
                            title="Remove Space"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleCollapse(idx)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
                          >
                            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Room Card Body */}
                      {!isCollapsed && (
                        <div className="p-4 sm:p-6 space-y-5 text-xs">
                          {/* 1. Type of Interior */}
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                              Type of Interior
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {INTERIOR_TYPES.map((t) => {
                                const isSelected = (room.interiorType || 'Residential') === t.id;
                                const Icon = t.icon;
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => updateRoomField(idx, 'interiorType', t.id)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer active:scale-95",
                                      isSelected
                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                                    )}
                                  >
                                    <Icon size={13} />
                                    {t.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* 2. Sub-tabs Navigation */}
                          <div className="flex items-center gap-2 border-b border-slate-200 pt-1">
                            <button
                              type="button"
                              onClick={() => setSubTab(idx, 'functional')}
                              className={cn(
                                "pb-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 border-b-2 -mb-px outline-none cursor-pointer",
                                currentSubTab === 'functional'
                                  ? "border-emerald-600 text-emerald-600"
                                  : "border-transparent text-slate-500 hover:text-slate-800"
                              )}
                            >
                              <Sliders size={13} />
                              Functional Requirements
                            </button>

                            <button
                              type="button"
                              onClick={() => setSubTab(idx, 'aesthetic')}
                              className={cn(
                                "pb-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 border-b-2 -mb-px outline-none cursor-pointer",
                                currentSubTab === 'aesthetic'
                                  ? "border-emerald-600 text-emerald-600"
                                  : "border-transparent text-slate-500 hover:text-slate-800"
                              )}
                            >
                              <Palette size={13} />
                              Aesthetic Requirements
                            </button>

                            <button
                              type="button"
                              onClick={() => setSubTab(idx, 'notes')}
                              className={cn(
                                "pb-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 border-b-2 -mb-px outline-none cursor-pointer",
                                currentSubTab === 'notes'
                                  ? "border-emerald-600 text-emerald-600"
                                  : "border-transparent text-slate-500 hover:text-slate-800"
                              )}
                            >
                              <Sparkles size={13} />
                              Observations & Notes
                            </button>
                          </div>

                          {/* Tab 1: Functional Requirements */}
                          {currentSubTab === 'functional' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-150">
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                  Room Usage & Primary Purpose
                                </label>
                                <input
                                  type="text"
                                  value={room.roomUsage || ''}
                                  onChange={(e) => updateRoomField(idx, 'roomUsage', e.target.value)}
                                  placeholder="e.g. Master sleeping & dressing, Formal entertaining, Executive cabin"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                  Furniture Requirements
                                </label>
                                <input
                                  type="text"
                                  value={room.furnitureRequirements || ''}
                                  onChange={(e) => updateRoomField(idx, 'furnitureRequirements', e.target.value)}
                                  placeholder="e.g. King-size hydraulic bed with upholstered headboard, 2 side tables, study desk"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                  Storage Requirements
                                </label>
                                <input
                                  type="text"
                                  value={room.storage || ''}
                                  onChange={(e) => updateRoomField(idx, 'storage', e.target.value)}
                                  placeholder="e.g. 3-door floor-to-ceiling sliding wardrobe, overhead loft, hidden shoe rack"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                  <Zap size={13} className="text-amber-500" />
                                  Electrical Points
                                </label>
                                <input
                                  type="text"
                                  value={room.electricalPoints || ''}
                                  onChange={(e) => updateRoomField(idx, 'electricalPoints', e.target.value)}
                                  placeholder="e.g. 2-way bedside switches, 16A AC point, TV & soundbar console wiring, USB docks"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                  <Sun size={13} className="text-amber-500" />
                                  Lighting Requirements
                                </label>
                                <input
                                  type="text"
                                  value={room.lightingRequirements || ''}
                                  onChange={(e) => updateRoomField(idx, 'lightingRequirements', e.target.value)}
                                  placeholder="e.g. 3000K warm white cove lighting, recessed spot lights, bedside reading lamps"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                  <Droplets size={13} className="text-cyan-500" />
                                  Plumbing Requirements
                                </label>
                                <input
                                  type="text"
                                  value={room.plumbingRequirements || ''}
                                  onChange={(e) => updateRoomField(idx, 'plumbingRequirements', e.target.value)}
                                  placeholder="e.g. Under-counter basin with hot/cold mixer, geyser provision, RO inlet"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                  Circulation & Space Clearance
                                </label>
                                <input
                                  type="text"
                                  value={room.circulation || ''}
                                  onChange={(e) => updateRoomField(idx, 'circulation', e.target.value)}
                                  placeholder="e.g. Minimum 3ft walkway around bed, handicap accessibility, unobstructed door swing"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400"
                                />
                              </div>
                            </div>
                          )}

                          {/* Tab 2: Aesthetic Requirements */}
                          {currentSubTab === 'aesthetic' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                              {/* Quick Style Chips */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                  Quick Style Presets
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                  {POPULAR_STYLES.map((style) => (
                                    <button
                                      key={style}
                                      type="button"
                                      onClick={() => updateRoomField(idx, 'designStyle', style)}
                                      className={cn(
                                        "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border cursor-pointer active:scale-95",
                                        room.designStyle === style
                                          ? "bg-emerald-600 text-white border-emerald-600"
                                          : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                                      )}
                                    >
                                      {style}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Design Style
                                  </label>
                                  <input
                                    type="text"
                                    value={room.designStyle || ''}
                                    onChange={(e) => updateRoomField(idx, 'designStyle', e.target.value)}
                                    placeholder="e.g. Modern Minimalist, Japandi, Industrial"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Colours & Palette
                                  </label>
                                  <input
                                    type="text"
                                    value={room.colours || ''}
                                    onChange={(e) => updateRoomField(idx, 'colours', e.target.value)}
                                    placeholder="e.g. Warm beige, Olive green accent, Charcoal grey, Walnut wood"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Materials & Finishes
                                  </label>
                                  <input
                                    type="text"
                                    value={room.materials || ''}
                                    onChange={(e) => updateRoomField(idx, 'materials', e.target.value)}
                                    placeholder="e.g. Natural teak veneer, Fluted glass, Brushed brass handles, Quartz tops"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Flooring Preferences
                                  </label>
                                  <input
                                    type="text"
                                    value={room.flooring || ''}
                                    onChange={(e) => updateRoomField(idx, 'flooring', e.target.value)}
                                    placeholder="e.g. 4x2 Vitrified matte tiles, Hardwood parquet, Italian marble"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Ceiling & False Ceiling
                                  </label>
                                  <input
                                    type="text"
                                    value={room.ceiling || ''}
                                    onChange={(e) => updateRoomField(idx, 'ceiling', e.target.value)}
                                    placeholder="e.g. Minimal peripheral gypsum ceiling with shadow gap & LED strip"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Wall Finishes & Paneling
                                  </label>
                                  <input
                                    type="text"
                                    value={room.wallFinishes || ''}
                                    onChange={(e) => updateRoomField(idx, 'wallFinishes', e.target.value)}
                                    placeholder="e.g. Limewash texture on bed back wall, Charcoal louvers on TV panel"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400"
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Furniture Style & Upholstery
                                  </label>
                                  <input
                                    type="text"
                                    value={room.furnitureStyle || ''}
                                    onChange={(e) => updateRoomField(idx, 'furnitureStyle', e.target.value)}
                                    placeholder="e.g. Low-profile modular frame, Boucle upholstery, Curved Scandinavian armchair"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Tab 3: Observations & Notes */}
                          {currentSubTab === 'notes' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                  <Sparkles size={13} className="text-emerald-600" />
                                  Specific Room Instructions / Observations
                                </label>
                                <textarea
                                  rows={3}
                                  value={room.description || ''}
                                  onChange={(e) => updateRoomField(idx, 'description', e.target.value)}
                                  placeholder="Describe specific wishes, inspirations, existing items to keep, or special preferences for this room..."
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all resize-none placeholder:text-slate-400 leading-relaxed"
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
                      <span>{isEditingForm ? 'Update My Requirements' : 'Submit My Requirements'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-12 text-center text-[11px] text-slate-500">
        <p>© {new Date().getFullYear()} {org.name || 'SkyStruct'}. Powered by SkyStruct Lite Architecture & CRM Portal.</p>
      </footer>

      {/* Submission Confirmation Modal */}
      <AnimatePresence>
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => !isSubmitting && setIsConfirmModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-2xs shrink-0">
                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      {isEditingForm ? 'Update Your Requirements?' : 'Submit Your Requirements?'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {isEditingForm
                        ? `Please confirm your modified specifications before sending updates to ${org.name || 'our design team'}.`
                        : `Please confirm before sending your brief to ${org.name || 'our design team'}.`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 sm:p-6 space-y-4 text-xs">
                {/* Summary Overview */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Submission Summary
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/70 space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-semibold block">Configured Spaces</span>
                      <p className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                        <Layers size={13} className="text-emerald-600" />
                        {rooms.length} {rooms.length === 1 ? 'Space' : 'Spaces'}
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/70 space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-semibold block">Target Budget</span>
                      <p className="text-sm font-black text-slate-900 flex items-center gap-1.5 truncate">
                        <DollarSign size={13} className="text-amber-500" />
                        {overallBudget || 'Not specified'}
                      </p>
                    </div>
                  </div>

                  {/* List of room names */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                      Included Spaces:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {rooms.map((r, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-[11px] font-semibold shadow-2xs"
                        >
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          {r.roomName || `Space ${i + 1}`}
                          {r.interiorType && (
                            <span className="text-[9px] text-slate-400 font-normal">({r.interiorType})</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reassurance banner */}
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-2.5 text-slate-700">
                  <Sparkles size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    Once submitted, our architects and interior designers will review your brief to prepare 2D layout drawings and 3D visual concepts.
                  </p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-all cursor-pointer disabled:opacity-50"
                >
                  Review & Edit
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={executeSubmit}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{isEditingForm ? 'Updating Brief...' : 'Submitting Brief...'}</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>{isEditingForm ? 'Yes, Update Requirements' : 'Yes, Submit Requirements'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
