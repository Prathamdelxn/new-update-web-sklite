'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Loader2, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import { uploadToCloudinary } from '@/lib/upload';

interface CompleteSnagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (proofUrl: string, resolutionDetails: string) => Promise<void>;
  snagTitle: string;
}

export const CompleteSnagModal: React.FC<CompleteSnagModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  snagTitle,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resolutionDetails, setResolutionDetails] = useState('Snag rectified by assignee.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleTriggerPicker = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Proof photo is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload file to Cloudinary
      const proofUrl = await uploadToCloudinary(file);
      if (!proofUrl) {
        throw new Error('Image upload failed');
      }

      await onComplete(proofUrl, resolutionDetails.trim());
      setFile(null);
      setPreviewUrl(null);
      setResolutionDetails('Snag rectified by assignee.');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete snag');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md relative z-10"
          >
            <div className="bg-white rounded-3xl border border-gray-150 shadow-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Complete Snag</h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-[280px] truncate">{snagTitle}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block ml-1">
                    Proof of Rectification
                  </label>
                  <p className="text-xs text-slate-400 ml-1">
                    Please upload a clear photo showing that the snag has been fixed.
                  </p>

                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {previewUrl ? (
                    <div className="relative rounded-2xl border border-slate-150 overflow-hidden group">
                      <img
                        src={previewUrl}
                        alt="Proof preview"
                        className="w-full h-44 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          setPreviewUrl(null);
                        }}
                        className="absolute right-3 top-3 p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl shadow-sm transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleTriggerPicker}
                      className="w-full h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/10 rounded-2xl transition-all space-y-2"
                    >
                      <Camera className="w-8 h-8 text-blue-600" />
                      <span className="text-xs font-bold text-blue-600">Add Proof Photo</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block ml-1">
                    Resolution Details
                  </label>
                  <textarea
                    rows={2}
                    value={resolutionDetails}
                    onChange={(e) => setResolutionDetails(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                    placeholder="Details about the rectification..."
                  />
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !file}
                    className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/10 flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Resolving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark as Resolved</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
