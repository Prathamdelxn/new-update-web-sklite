'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  UploadCloud,
  MapPin,
  Ruler,
  FileText,
  Image as ImageIcon,
  Columns,
  Zap,
  Droplets,
  Wind,
  Armchair,
  AlertTriangle,
  Layers,
  DoorOpen,
  Maximize2
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { motion } from 'framer-motion';
import { validatePositiveNumber, ValidationErrors } from '@/lib/crmValidation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess: () => void;
  users?: any[];
  initialMeasurements?: any;
  initialPhotos?: string[];
}

export const InteriorLogSiteVisitModal = ({
  isOpen,
  onClose,
  customerId,
  onSuccess,
  initialMeasurements,
  initialPhotos = []
}: Props) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const [measurements, setMeasurements] = useState({
    carpetArea: '',
    roomDimensions: '',
    ceilingHeight: '',
    floorToCeilingHeight: '',
    doorDimensions: '',
    windowDimensions: '',
    wallThickness: '',
    columnBeamDimensions: '',
    electricalPoints: '',
    plumbingPoints: '',
    acLocations: '',
    furnitureDimensions: '',
    siteConstraints: '',
    rooms: '',
    notes: ''
  });

  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (initialMeasurements) {
        setMeasurements({
          carpetArea: initialMeasurements.carpetArea || '',
          roomDimensions: initialMeasurements.roomDimensions || '',
          ceilingHeight: initialMeasurements.ceilingHeight || '',
          floorToCeilingHeight: initialMeasurements.floorToCeilingHeight || '',
          doorDimensions: initialMeasurements.doorDimensions || '',
          windowDimensions: initialMeasurements.windowDimensions || '',
          wallThickness: initialMeasurements.wallThickness || '',
          columnBeamDimensions: initialMeasurements.columnBeamDimensions || '',
          electricalPoints: initialMeasurements.electricalPoints || '',
          plumbingPoints: initialMeasurements.plumbingPoints || '',
          acLocations: initialMeasurements.acLocations || '',
          furnitureDimensions: initialMeasurements.furnitureDimensions || '',
          siteConstraints: initialMeasurements.siteConstraints || '',
          rooms: initialMeasurements.rooms || '',
          notes: initialMeasurements.notes || ''
        });
      } else {
        setMeasurements({
          carpetArea: '',
          roomDimensions: '',
          ceilingHeight: '',
          floorToCeilingHeight: '',
          doorDimensions: '',
          windowDimensions: '',
          wallThickness: '',
          columnBeamDimensions: '',
          electricalPoints: '',
          plumbingPoints: '',
          acLocations: '',
          furnitureDimensions: '',
          siteConstraints: '',
          rooms: '',
          notes: ''
        });
      }
      setPhotos(initialPhotos || []);
      setErrors({});
    }
  }, [isOpen, initialMeasurements, initialPhotos]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    if (measurements.carpetArea && validatePositiveNumber(measurements.carpetArea, 'Carpet Area')) {
      newErrors.carpetArea = validatePositiveNumber(measurements.carpetArea, 'Carpet Area');
    }
    if (measurements.ceilingHeight && validatePositiveNumber(measurements.ceilingHeight, 'Ceiling Height')) {
      newErrors.ceilingHeight = validatePositiveNumber(measurements.ceilingHeight, 'Ceiling Height');
    }
    setErrors(newErrors);
    return !Object.values(newErrors).some((err) => err !== null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the measurement errors');
      return;
    }
    setIsSubmitting(true);

    try {
      const updatePayload: any = {
        status: 'Measurement Done',
        siteMeasurements: {
          carpetArea: measurements.carpetArea.trim(),
          roomDimensions: measurements.roomDimensions.trim(),
          ceilingHeight: measurements.ceilingHeight.trim(),
          floorToCeilingHeight: measurements.floorToCeilingHeight.trim(),
          doorDimensions: measurements.doorDimensions.trim(),
          windowDimensions: measurements.windowDimensions.trim(),
          wallThickness: measurements.wallThickness.trim(),
          columnBeamDimensions: measurements.columnBeamDimensions.trim(),
          electricalPoints: measurements.electricalPoints.trim(),
          plumbingPoints: measurements.plumbingPoints.trim(),
          acLocations: measurements.acLocations.trim(),
          furnitureDimensions: measurements.furnitureDimensions.trim(),
          siteConstraints: measurements.siteConstraints.trim(),
          rooms: measurements.rooms.trim(),
          notes: measurements.notes.trim()
        },
        sitePhotos: photos
      };

      await interiorCrmService.updateCustomer(customerId, updatePayload);

      await interiorCrmService.createActivity({
        customer: customerId,
        type: 'Site Visit',
        status: 'Completed',
        remarks: 'Completed site visit and recorded full measurements & site photos.',
        scheduledDate: new Date(),
        completedDate: new Date()
      });

      toast.success('Site visit measurements logged successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to log site visit');
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
        className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
              <MapPin size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[hsl(var(--foreground))] tracking-tight">
                Log Site Visit & Measurements
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Record detailed spatial dimensions, MEP points, structural constraints, and site photos.
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-6 custom-scrollbar">
          {/* Section 1: Room & Spatial Dimensions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[hsl(var(--border))]">
              <Ruler size={16} className="text-purple-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))]">
                Room & Spatial Dimensions
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5 flex items-center gap-1.5">
                  <Maximize2 size={13} className="text-purple-500" />
                  Room Length × Width
                </label>
                <input
                  type="text"
                  value={measurements.roomDimensions}
                  onChange={(e) => setMeasurements({ ...measurements, roomDimensions: e.target.value })}
                  className="w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                  placeholder="e.g. Living: 18'x12', Bed: 14'x11'"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5 flex items-center gap-1.5">
                  <Layers size={13} className="text-purple-500" />
                  Ceiling Height (Ft)
                </label>
                <input
                  type="text"
                  value={measurements.ceilingHeight}
                  onChange={(e) => {
                    setMeasurements({ ...measurements, ceilingHeight: e.target.value });
                    if (errors.ceilingHeight) setErrors({ ...errors, ceilingHeight: null });
                  }}
                  className={`w-full bg-[hsl(var(--muted))] border rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] outline-none transition-all placeholder:text-[hsl(var(--muted-foreground)/0.6)] ${
                    errors.ceilingHeight
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-[hsl(var(--border))] focus:ring-2 focus:ring-[hsl(var(--ring))]'
                  }`}
                  placeholder="e.g. 10.5"
                />
                {errors.ceilingHeight && <p className="text-[10px] text-red-500 mt-1">{errors.ceilingHeight}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5 flex items-center gap-1.5">
                  <Layers size={13} className="text-indigo-500" />
                  Floor-to-Ceiling Height
                </label>
                <input
                  type="text"
                  value={measurements.floorToCeilingHeight}
                  onChange={(e) => setMeasurements({ ...measurements, floorToCeilingHeight: e.target.value })}
                  className="w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                  placeholder="e.g. 9.8 ft finish to slab"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5">
                  Carpet Area (Sq.Ft)
                </label>
                <input
                  type="text"
                  value={measurements.carpetArea}
                  onChange={(e) => {
                    setMeasurements({ ...measurements, carpetArea: e.target.value });
                    if (errors.carpetArea) setErrors({ ...errors, carpetArea: null });
                  }}
                  className={`w-full bg-[hsl(var(--muted))] border rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] outline-none transition-all placeholder:text-[hsl(var(--muted-foreground)/0.6)] ${
                    errors.carpetArea
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-[hsl(var(--border))] focus:ring-2 focus:ring-[hsl(var(--ring))]'
                  }`}
                  placeholder="e.g. 1200"
                />
                {errors.carpetArea && <p className="text-[10px] text-red-500 mt-1">{errors.carpetArea}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5">
                  Rooms to Design (e.g. 3BHK)
                </label>
                <input
                  type="text"
                  value={measurements.rooms}
                  onChange={(e) => setMeasurements({ ...measurements, rooms: e.target.value })}
                  className="w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                  placeholder="e.g. Living, Foyer, Kitchen, Master Bedroom, Kids Bedroom"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Structural & Openings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[hsl(var(--border))]">
              <DoorOpen size={16} className="text-blue-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))]">
                Openings & Structural Elements
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5 flex items-center gap-1.5">
                  <DoorOpen size={13} className="text-blue-500" />
                  Door Dimensions
                </label>
                <input
                  type="text"
                  value={measurements.doorDimensions}
                  onChange={(e) => setMeasurements({ ...measurements, doorDimensions: e.target.value })}
                  className="w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                  placeholder="e.g. Main: 3.5'×7', Internal: 3'×7', Bath: 2.5'×7'"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5 flex items-center gap-1.5">
                  <Maximize2 size={13} className="text-sky-500" />
                  Window Dimensions
                </label>
                <input
                  type="text"
                  value={measurements.windowDimensions}
                  onChange={(e) => setMeasurements({ ...measurements, windowDimensions: e.target.value })}
                  className="w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                  placeholder="e.g. Living sliding 6'×5', Bed 4'×4' with 2.5' sill"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5 flex items-center gap-1.5">
                  <Columns size={13} className="text-amber-500" />
                  Wall Thickness
                </label>
                <input
                  type="text"
                  value={measurements.wallThickness}
                  onChange={(e) => setMeasurements({ ...measurements, wallThickness: e.target.value })}
                  className="w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                  placeholder="e.g. Outer: 9 inch, Partition: 4.5 inch"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5 flex items-center gap-1.5">
                  <Columns size={13} className="text-orange-500" />
                  Column / Beam Dimensions
                </label>
                <input
                  type="text"
                  value={measurements.columnBeamDimensions}
                  onChange={(e) => setMeasurements({ ...measurements, columnBeamDimensions: e.target.value })}
                  className="w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                  placeholder="e.g. Columns: 9in x 18in, Beam drop: 12in from ceiling"
                />
              </div>
            </div>
          </div>

          {/* Section 3: MEP & Services */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[hsl(var(--border))]">
              <Zap size={16} className="text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))]">
                MEP & Services (Electrical, Plumbing, AC)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5 flex items-center gap-1.5">
                  <Zap size={13} className="text-amber-500" />
                  Existing Electrical Points
                </label>
                <textarea
                  value={measurements.electricalPoints}
                  onChange={(e) => setMeasurements({ ...measurements, electricalPoints: e.target.value })}
                  className="w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all h-20 resize-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                  placeholder="e.g. DB near entrance, 6A/16A points on TV wall, bedside 2-way switches"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5 flex items-center gap-1.5">
                  <Droplets size={13} className="text-cyan-500" />
                  Plumbing Points
                </label>
                <textarea
                  value={measurements.plumbingPoints}
                  onChange={(e) => setMeasurements({ ...measurements, plumbingPoints: e.target.value })}
                  className="w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all h-20 resize-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                  placeholder="e.g. Kitchen sink inlet/drain, RO water point, washbasin trap locations"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5 flex items-center gap-1.5">
                  <Wind size={13} className="text-emerald-500" />
                  AC Locations & Piping
                </label>
                <textarea
                  value={measurements.acLocations}
                  onChange={(e) => setMeasurements({ ...measurements, acLocations: e.target.value })}
                  className="w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all h-20 resize-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                  placeholder="e.g. Split AC provision on north wall, copper piping route, outdoor unit in utility"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Existing Furniture & Site Constraints */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[hsl(var(--border))]">
              <Armchair size={16} className="text-emerald-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))]">
                Existing Furniture & Site Constraints
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5 flex items-center gap-1.5">
                  <Armchair size={13} className="text-emerald-500" />
                  Existing Furniture Dimensions
                </label>
                <textarea
                  value={measurements.furnitureDimensions}
                  onChange={(e) => setMeasurements({ ...measurements, furnitureDimensions: e.target.value })}
                  className="w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all h-20 resize-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                  placeholder="e.g. Client retaining king bed 6'x6.5', 6-seater dining table 5'x3'"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-rose-500" />
                  Any Site Constraints
                </label>
                <textarea
                  value={measurements.siteConstraints}
                  onChange={(e) => setMeasurements({ ...measurements, siteConstraints: e.target.value })}
                  className="w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all h-20 resize-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                  placeholder="e.g. No heavy drilling allowed after 6 PM, 4th floor staircase only, dampness on east wall"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5 flex items-center gap-1.5">
                  <FileText size={13} className="text-slate-500" />
                  Additional Site Notes / Observations
                </label>
                <textarea
                  value={measurements.notes}
                  onChange={(e) => setMeasurements({ ...measurements, notes: e.target.value })}
                  className="w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all h-20 resize-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                  placeholder="Enter any additional remarks, client preferences observed on site..."
                />
              </div>
            </div>
          </div>

          {/* Section 5: Photos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[hsl(var(--border))]">
              <ImageIcon size={16} className="text-emerald-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))]">
                Site Photos ({photos.length})
              </h3>
            </div>

            <div className="border-2 border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] rounded-2xl p-6 text-center hover:bg-[hsl(var(--accent))] transition-colors relative cursor-pointer group">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud
                className="mx-auto text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors mb-2"
                size={32}
              />
              <p className="text-xs font-bold text-[hsl(var(--foreground))]">Click or drag photos to upload</p>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                High resolution images of rooms, walls, electrical boards, windows & site condition
              </p>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-xl overflow-hidden border border-[hsl(var(--border))] group shadow-sm bg-[hsl(var(--card))]"
                  >
                    <img src={photo} alt={`Site ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 flex gap-3 mt-auto border-t border-[hsl(var(--border))]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] transition-colors disabled:opacity-50 shadow-md shadow-[hsl(var(--primary)/0.2)]"
            >
              {isSubmitting ? 'Saving Measurements...' : 'Save Site Visit Measurements'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
