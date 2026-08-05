'use client';

// Port of src/components/modals/LogSiteVisitModal.tsx, rewired to interiorCrmService.

import React, { useState } from 'react';
import { X, UploadCloud, MapPin, Ruler, FileText, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { motion } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess: () => void;
  users?: any[];
}

export const InteriorLogSiteVisitModal = ({ isOpen, onClose, customerId, onSuccess }: Props) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [measurements, setMeasurements] = useState({
    carpetArea: '',
    ceilingHeight: '',
    rooms: '',
    notes: ''
  });

  const [photos, setPhotos] = useState<string[]>([]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updatePayload: any = {
        status: 'Measurement Done',
        siteMeasurements: measurements,
        sitePhotos: photos,
      };

      await interiorCrmService.updateCustomer(customerId, updatePayload);

      await interiorCrmService.createActivity({
        customer: customerId,
        type: 'Site Visit',
        status: 'Completed',
        remarks: 'Completed site visit and uploaded measurements/photos.',
        scheduledDate: new Date(),
        completedDate: new Date()
      });

      toast.success('Site visit logged successfully!');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center p-6 border-b border-[hsl(var(--border))]">
          <div>
            <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))] flex items-center gap-2">
              <MapPin className="text-[hsl(var(--primary))]" /> Log Site Visit
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Record measurements and upload site photos.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-6">

          {/* Measurements Section */}
          <div>
            <h3 className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2 mb-4 uppercase tracking-wider">
              <Ruler size={16} className="text-purple-500"/> Measurements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1">Carpet Area (Sq.Ft)</label>
                <input
                  type="text"
                  value={measurements.carpetArea}
                  onChange={(e) => setMeasurements({...measurements, carpetArea: e.target.value})}
                  className="w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all"
                  placeholder="e.g. 1200"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1">Ceiling Height (Ft)</label>
                <input
                  type="text"
                  value={measurements.ceilingHeight}
                  onChange={(e) => setMeasurements({...measurements, ceilingHeight: e.target.value})}
                  className="w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all"
                  placeholder="e.g. 10.5"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1">Rooms to design (e.g. 3BHK)</label>
                <input
                  type="text"
                  value={measurements.rooms}
                  onChange={(e) => setMeasurements({...measurements, rooms: e.target.value})}
                  className="w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all"
                  placeholder="Kitchen, Living Room, 2 Bedrooms"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1 flex items-center gap-1"><FileText size={14}/> Site Notes</label>
                <textarea
                  value={measurements.notes}
                  onChange={(e) => setMeasurements({...measurements, notes: e.target.value})}
                  className="w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all h-24 resize-none"
                  placeholder="Enter any additional observations about the site..."
                />
              </div>
            </div>
          </div>

          <hr className="border-[hsl(var(--border))]" />

          {/* Photos Section */}
          <div>
             <h3 className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2 mb-4 uppercase tracking-wider">
              <ImageIcon size={16} className="text-emerald-500"/> Site Photos
            </h3>

            <div className="border-2 border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))] rounded-2xl p-6 text-center hover:bg-[hsl(var(--accent))] transition-colors relative cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="mx-auto text-[hsl(var(--muted-foreground))] mb-2" size={32} />
              <p className="text-sm font-bold text-[hsl(var(--foreground))]">Click or drag photos to upload</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">High resolution images of the space</p>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mt-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-[hsl(var(--border))] group">
                    <img src={photo} alt={`Site ${index}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-3 mt-auto">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl font-bold text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Site Visit'}
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
};
