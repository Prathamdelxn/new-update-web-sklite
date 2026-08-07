import React, { useState } from 'react';
import { X, UploadCloud, MapPin, Ruler, FileText, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import interiorApiClient from '@/services/interiorApi.client';
import { motion, AnimatePresence } from 'framer-motion';
import { validatePositiveNumber, ValidationErrors } from '@/lib/crmValidation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess: () => void;
  users?: any[]; // Organization users for assignment
}

export const LogSiteVisitModal = ({ isOpen, onClose, customerId, onSuccess, users = [] }: Props) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [measurements, setMeasurements] = useState({
    carpetArea: '',
    ceilingHeight: '',
    rooms: '',
    notes: ''
  });
  
  const [photos, setPhotos] = useState<string[]>([]); // Array of Base64 strings for now

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

  const [errors, setErrors] = useState<ValidationErrors>({});

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
      // 1. Update Customer with site data and change status to Measurement Done
      const updatePayload: any = {
        status: 'Measurement Done',
        siteMeasurements: {
          ...measurements,
          carpetArea: measurements.carpetArea.trim(),
          ceilingHeight: measurements.ceilingHeight.trim(),
          rooms: measurements.rooms.trim(),
          notes: measurements.notes.trim(),
        },
        sitePhotos: photos, // Temporary base64 storage
      };

      await interiorApiClient.patch(`/crm/customers/${customerId}`, updatePayload);

      // 2. Log Activity
      await interiorApiClient.post('/crm/activities', {
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
        className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <MapPin className="text-blue-600" /> Log Site Visit
            </h2>
            <p className="text-sm text-slate-500 mt-1">Record measurements and upload site photos.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          
          {/* Measurements Section */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4 uppercase tracking-wider">
              <Ruler size={16} className="text-purple-500"/> Measurements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Carpet Area (Sq.Ft)</label>
                <input 
                  type="text" 
                  value={measurements.carpetArea}
                  onChange={(e) => setMeasurements({...measurements, carpetArea: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="e.g. 1200"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Ceiling Height (Ft)</label>
                <input 
                  type="text" 
                  value={measurements.ceilingHeight}
                  onChange={(e) => setMeasurements({...measurements, ceilingHeight: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="e.g. 10.5"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Rooms to design (e.g. 3BHK)</label>
                <input 
                  type="text" 
                  value={measurements.rooms}
                  onChange={(e) => setMeasurements({...measurements, rooms: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="Kitchen, Living Room, 2 Bedrooms"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><FileText size={14}/> Site Notes</label>
                <textarea 
                  value={measurements.notes}
                  onChange={(e) => setMeasurements({...measurements, notes: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all h-24 resize-none"
                  placeholder="Enter any additional observations about the site..."
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Photos Section */}
          <div>
             <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4 uppercase tracking-wider">
              <ImageIcon size={16} className="text-emerald-500"/> Site Photos
            </h3>
            
            <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl p-6 text-center hover:bg-slate-100 transition-colors relative cursor-pointer">
              <input 
                type="file" 
                multiple 
                accept="image/*"
                onChange={handlePhotoUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="mx-auto text-slate-400 mb-2" size={32} />
              <p className="text-sm font-bold text-slate-700">Click or drag photos to upload</p>
              <p className="text-xs text-slate-500 mt-1">High resolution images of the space</p>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mt-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
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
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Site Visit'}
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
};
