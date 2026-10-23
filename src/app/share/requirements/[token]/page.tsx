'use client';

// =============================================================================
// Sky-Lite Web — Client Public Requirements & Design Wishlist Portal
// Mobile-first, professional studio intake form for clients to share their style,
// living needs, room-by-room wishlist, and design inspiration photos.
// =============================================================================

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Heart,
  Home,
  CheckCircle2,
  Plus,
  Trash2,
  UploadCloud,
  Image as ImageIcon,
  Check,
  Building,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  Send,
  Loader2,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Clock,
  Palette,
  Armchair,
  X,
} from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { uploadToCloudinary } from '@/lib/upload';
import { cn } from '@/lib/utils';

const POPULAR_STYLES = [
  { id: 'Modern Minimalist', label: 'Modern Minimalist', desc: 'Clean lines, uncluttered, functional aesthetics', color: 'from-zinc-500/10 to-stone-500/10' },
  { id: 'Japandi', label: 'Japandi', desc: 'Japanese elegance meets Scandinavian warm wood & textures', color: 'from-amber-500/10 to-orange-500/10' },
  { id: 'Scandinavian', label: 'Scandinavian', desc: 'Light woods, warm whites, cozy hygge atmosphere', color: 'from-sky-500/10 to-indigo-500/10' },
  { id: 'Contemporary', label: 'Contemporary', desc: 'Sleek metal accents, fluted glass, trendsetting lighting', color: 'from-emerald-500/10 to-teal-500/10' },
  { id: 'Classic Luxury', label: 'Classic Luxury', desc: 'Mouldings, marble accents, warm chandeliers, rich fabrics', color: 'from-purple-500/10 to-pink-500/10' },
  { id: 'Industrial Chic', label: 'Industrial Chic', desc: 'Exposed bricks, dark iron profiles, concrete & raw woods', color: 'from-neutral-500/10 to-slate-500/10' },
  { id: 'Bohemian / Organic', label: 'Bohemian / Organic', desc: 'Rattan, indoor plants, earthy tones, relaxed vibes', color: 'from-lime-500/10 to-emerald-500/10' },
];

const LIFESTYLE_PRIORITIES = [
  'Work From Home Desk',
  'Pet Friendly (Durable fabrics)',
  'Child Friendly (Rounded corners)',
  'Frequent Guest Entertaining',
  'Heavy Cooking / Spice Storage',
  'Low Maintenance Surfaces',
  'Maximum Hidden Storage',
  'Dedicated Pooja / Prayer Unit',
  'Acoustic / Quiet Work Zones',
  'Smart Lighting & Automation',
];

const STANDARD_ROOMS = [
  'Living Room',
  'Master Bedroom',
  'Kitchen',
  'Dining Area',
  'Kids / Youth Bedroom',
  'Guest Bedroom',
  'Balcony / Terrace',
  'Pooja Room',
  'Home Office / Study',
  'Foyer / Entryway',
];

interface RoomItem {
  roomName: string;
  priority: 'Must Have' | 'Good to Have' | 'Nice to Have';
  wishedItems: string;
  aestheticNotes: string;
}

export default function ClientRequirementsSharePage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lead & Org data
  const [lead, setLead] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);

  // Form State
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [overallVibe, setOverallVibe] = useState('');
  const [familyComposition, setFamilyComposition] = useState('');
  const [mustHaves, setMustHaves] = useState('');
  const [mustAvoids, setMustAvoids] = useState('');
  const [notes, setNotes] = useState('');

  // Room Wishlists
  const [rooms, setRooms] = useState<RoomItem[]>([
    { roomName: 'Living Room', priority: 'Must Have', wishedItems: '', aestheticNotes: '' },
    { roomName: 'Master Bedroom', priority: 'Must Have', wishedItems: '', aestheticNotes: '' },
    { roomName: 'Kitchen', priority: 'Must Have', wishedItems: '', aestheticNotes: '' },
  ]);
  const [customRoomName, setCustomRoomName] = useState('');

  // Inspiration Images
  const [inspirationImages, setInspirationImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!token) return;
      try {
        setLoading(true);
        const res = await interiorCrmService.getClientRequirements(token);
        if (res.success && res.data) {
          setLead(res.data.lead);
          setOrganization(res.data.organization);

          // If previously submitted, pre-populate
          if (res.data.clientWishlist) {
            const cw = res.data.clientWishlist;
            if (cw.preferredStyles) setSelectedStyles(cw.preferredStyles);
            if (cw.lifestylePriorities) setSelectedPriorities(cw.lifestylePriorities);
            if (cw.overallVibe) setOverallVibe(cw.overallVibe);
            if (cw.familyComposition) setFamilyComposition(cw.familyComposition);
            if (cw.mustHaves) setMustHaves(cw.mustHaves);
            if (cw.mustAvoids) setMustAvoids(cw.mustAvoids);
            if (cw.notes) setNotes(cw.notes);
            if (cw.rooms && cw.rooms.length > 0) setRooms(cw.rooms);
            if (cw.inspirationImages) setInspirationImages(cw.inspirationImages);
            if (cw.submittedAt) setSubmitted(true);
          }
        } else {
          setError(res.error || 'Invalid or expired requirements link.');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Unable to load requirements portal.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);

  const toggleStyle = (styleId: string) => {
    setSelectedStyles((prev) =>
      prev.includes(styleId) ? prev.filter((s) => s !== styleId) : [...prev, styleId]
    );
  };

  const togglePriority = (p: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const handleAddRoom = (name: string) => {
    if (!name.trim()) return;
    if (rooms.some((r) => r.roomName.toLowerCase() === name.trim().toLowerCase())) return;
    setRooms((prev) => [
      ...prev,
      { roomName: name.trim(), priority: 'Must Have', wishedItems: '', aestheticNotes: '' },
    ]);
    setCustomRoomName('');
  };

  const handleRemoveRoom = (index: number) => {
    setRooms((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRoom = (index: number, field: keyof RoomItem, value: any) => {
    setRooms((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleInspirationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    try {
      const uploads = Array.from(files);
      for (const file of uploads) {
        const url = await uploadToCloudinary(file);
        if (url) {
          setInspirationImages((prev) => [...prev, url]);
        }
      }
    } catch (err) {
      console.error('Failed to upload inspiration image', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeInspirationImage = (index: number) => {
    setInspirationImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    try {
      const payload = {
        preferredStyles: selectedStyles,
        overallVibe,
        familyComposition,
        lifestylePriorities: selectedPriorities,
        mustHaves,
        mustAvoids,
        inspirationImages,
        rooms,
        notes,
      };

      const res = await interiorCrmService.submitClientRequirements(token, payload);
      if (res.success) {
        setSubmitted(true);
      } else {
        alert(res.error || 'Failed to submit requirements.');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit requirements.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading your design questionnaire...</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-sm">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Requirements Link Unavailable</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {error || 'This requirements submission link is invalid, expired, or has been disabled.'}
          </p>
          <p className="text-[11px] text-slate-400 mt-4">
            Please reach out to your interior design team to receive an active link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 pb-20">
      {/* Top Header / Branding Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {organization?.logo ? (
              <img src={organization.logo} alt={organization.name} className="h-8 w-auto object-contain rounded" />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {organization?.name?.[0] || 'S'}
              </div>
            )}
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                {organization?.name || 'Interior Studio'}
              </h1>
              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                <ShieldCheck size={11} className="text-emerald-500" /> Client Design Wishlist Intake
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Project For</span>
            <span className="text-xs font-bold text-slate-800">{lead.name}</span>
          </div>
        </div>
      </header>

      {/* Hero Welcome Banner */}
      <div className="max-w-4xl mx-auto px-4 pt-6 sm:pt-8 pb-4">
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-semibold text-indigo-200 mb-3 border border-white/10">
              <Sparkles size={12} className="text-amber-300" /> Design Onboarding
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
              Tell us about your dream space, {lead.name.split(' ')[0]}!
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100/90 mt-2 leading-relaxed">
              Help our 2D/3D design team craft custom layouts and realistic 3D renders that reflect your personal taste, functional needs, and everyday lifestyle.
            </p>
            <div className="flex items-center gap-4 mt-4 text-[11px] text-indigo-200/80 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Building size={13} /> {lead.propertyType || 'Residential Space'}
              </span>
              {lead.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} /> {lead.city}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Body */}
      <main className="max-w-4xl mx-auto px-4 mt-4">
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-emerald-200 p-8 sm:p-12 text-center shadow-sm"
          >
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-4 border border-emerald-100">
              <CheckCircle2 size={32} />
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 uppercase tracking-wider">
              Wishlist Received!
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-3">
              Thank you, {lead.name}!
            </h3>
            <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto leading-relaxed">
              Your preferences have been successfully submitted to your assigned design team. We are now preparing your personalized 2D spatial layouts & 3D renders.
            </p>
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors"
              >
                Need to edit or add more details? Click here
              </button>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── SECTION 1: STYLE PREFERENCES ── */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                  <Palette size={16} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    1. Preferred Aesthetic & Interior Style
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Select one or more styles that inspire you the most (tap to select).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {POPULAR_STYLES.map((st) => {
                  const isSelected = selectedStyles.includes(st.id);
                  return (
                    <button
                      type="button"
                      key={st.id}
                      onClick={() => toggleStyle(st.id)}
                      className={cn(
                        'text-left p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between',
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-600/30'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn('text-xs font-bold', isSelected ? 'text-indigo-900' : 'text-slate-800')}>
                            {st.label}
                          </span>
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-colors',
                              isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white text-transparent'
                            )}
                          >
                            <Check size={11} />
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{st.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Describe your ideal vibe in your own words (optional):
                </label>
                <textarea
                  value={overallVibe}
                  onChange={(e) => setOverallVibe(e.target.value)}
                  placeholder="e.g. Warm and cozy with lots of natural wood, soft lighting, and clean uncluttered surfaces..."
                  rows={2}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* ── SECTION 2: LIFESTYLE & HOUSEHOLD PROFILE ── */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <Armchair size={16} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    2. Lifestyle & Living Priorities
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Who lives here and what functional needs should we design around?
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Family / Household Composition:
                </label>
                <input
                  type="text"
                  value={familyComposition}
                  onChange={(e) => setFamilyComposition(e.target.value)}
                  placeholder="e.g., Couple with 1 teenager and a golden retriever, parents visit often"
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Select your functional priorities:
                </label>
                <div className="flex flex-wrap gap-2">
                  {LIFESTYLE_PRIORITIES.map((item) => {
                    const isSelected = selectedPriorities.includes(item);
                    return (
                      <button
                        type="button"
                        key={item}
                        onClick={() => togglePriority(item)}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5',
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        )}
                      >
                        {isSelected && <Check size={12} />}
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── SECTION 3: ROOM-BY-ROOM WISHLIST ── */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <Home size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      3. Room-by-Room Wishlist & Specific Needs
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Specify what furniture and features you envision in each space.
                    </p>
                  </div>
                </div>

                {/* Add Quick Room Dropdown */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddRoom(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="text-xs bg-slate-100 hover:bg-slate-200 border-none font-bold text-slate-700 rounded-xl px-3 py-2 cursor-pointer outline-none"
                    >
                      <option value="">+ Add Standard Room</option>
                      {STANDARD_ROOMS.filter(
                        (sr) => !rooms.some((r) => r.roomName.toLowerCase() === sr.toLowerCase())
                      ).map((sr) => (
                        <option key={sr} value={sr}>
                          {sr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={customRoomName}
                      onChange={(e) => setCustomRoomName(e.target.value)}
                      placeholder="Or Custom Area..."
                      className="text-xs rounded-xl border border-slate-200 px-2.5 py-1.5 w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddRoom(customRoomName)}
                      className="p-1.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 text-xs font-bold"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Room Cards Stack */}
              <div className="space-y-3.5">
                {rooms.map((room, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 relative transition-colors hover:border-slate-300"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800">{room.roomName}</h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={room.priority}
                          onChange={(e) => updateRoom(idx, 'priority', e.target.value)}
                          className={cn(
                            'text-[10px] font-bold uppercase tracking-wider rounded-lg px-2 py-1 border outline-none cursor-pointer',
                            room.priority === 'Must Have'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : room.priority === 'Good to Have'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          )}
                        >
                          <option value="Must Have">Must Have</option>
                          <option value="Good to Have">Good to Have</option>
                          <option value="Nice to Have">Nice to Have</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveRoom(idx)}
                          className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                          title="Remove Room"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Wished Furniture & Features:
                        </label>
                        <input
                          type="text"
                          value={room.wishedItems}
                          onChange={(e) => updateRoom(idx, 'wishedItems', e.target.value)}
                          placeholder="e.g. King Bed, Hydraulic storage, TV console, 3-door wardrobe"
                          className="w-full text-xs rounded-xl border border-slate-200 p-2 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Aesthetic or Mood Notes:
                        </label>
                        <input
                          type="text"
                          value={room.aestheticNotes}
                          onChange={(e) => updateRoom(idx, 'aestheticNotes', e.target.value)}
                          placeholder="e.g. Dark charcoal headboard, warm indirect cove light, brass handles"
                          className="w-full text-xs rounded-xl border border-slate-200 p-2 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── SECTION 4: INSPIRATION PHOTOS ── */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
                <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-100">
                  <ImageIcon size={16} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    4. Inspiration Photos & Pinterest Screenshots
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Upload screenshots or photos of designs you love so our 3D designers can replicate the vibe.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {inspirationImages.map((imgUrl, imgIdx) => (
                  <div key={imgIdx} className="relative group rounded-2xl overflow-hidden aspect-square border border-slate-200">
                    <img src={imgUrl} alt={`Inspiration ${imgIdx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeInspirationImage(imgIdx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl flex flex-col items-center justify-center p-4 text-center cursor-pointer aspect-square bg-slate-50/50 hover:bg-indigo-50/20 transition-all">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleInspirationUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                  {uploadingImage ? (
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700">Upload Photos</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WebP</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* ── SECTION 5: MUST-HAVES & MUST-AVOIDS ── */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    5. Non-Negotiables & Special Directives
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tell us what you absolutely love, and what you dislike.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">
                    ✅ Must Haves (Absolute Priorities):
                  </label>
                  <textarea
                    value={mustHaves}
                    onChange={(e) => setMustHaves(e.target.value)}
                    placeholder="e.g., Hidden shoe storage for 30 pairs, breakfast counter with 2 high chairs, master bed soundproofing..."
                    rows={3}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-rose-800 mb-1">
                    ❌ Must Avoids (Things you dislike):
                  </label>
                  <textarea
                    value={mustAvoids}
                    onChange={(e) => setMustAvoids(e.target.value)}
                    placeholder="e.g., No glossy acrylic finishes, avoid bright yellows or reds, no open shelves that catch dust..."
                    rows={3}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Additional Notes or Questions for the Designer:
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything else you'd like our team to know before we begin your 2D and 3D designs..."
                  rows={2}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="sticky bottom-4 z-30">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xl flex items-center justify-between gap-4">
                <div className="text-xs text-slate-500 hidden sm:block">
                  Submitting will share your brief directly with your assigned design team.
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting Brief...
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Submit Design Wishlist
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
