'use client';

// Port of src/components/modals/UploadDesignModal.tsx, rewired to interiorCrmService.

import React, { useState } from 'react';
import { X, UploadCloud, File as FileIcon, Trash2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { motion } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess: () => void;
  existingFiles?: any[];
}

export const InteriorUploadDesignModal = ({ isOpen, onClose, customerId, onSuccess, existingFiles = [] }: Props) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newFiles, setNewFiles] = useState<{name: string, url: string, fileType: string}[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setNewFiles(prev => [...prev, {
            name: file.name,
            url: event.target!.result as string,
            fileType: file.type.includes('pdf') ? 'pdf' : 'image'
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newFiles.length === 0) {
      toast.error('Please select at least one design file or image to upload.');
      return;
    }
    setIsSubmitting(true);

    try {
      const updatedFiles = [...existingFiles, ...newFiles];

      await interiorCrmService.updateCustomer(customerId, {
        status: 'Design Approved',
        designFiles: updatedFiles,
      });

      await interiorCrmService.createActivity({
        customer: customerId,
        type: 'Design Shared',
        status: 'Completed',
        remarks: `Uploaded ${newFiles.length} new design files (2D/3D).`,
        completedDate: new Date()
      });

      toast.success('Design files uploaded successfully!');
      onSuccess();
      onClose();
      setNewFiles([]);
    } catch (error) {
      toast.error('Failed to upload design files');
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
        className="bg-[hsl(var(--card))] rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center p-6 border-b border-[hsl(var(--border))]">
          <div>
            <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))] flex items-center gap-2">
              <UploadCloud className="text-[hsl(var(--primary))]" /> Upload 2D/3D Designs
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Upload PDF layouts or high-res 3D renders.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-6">

          <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-2xl p-8 text-center hover:bg-blue-50 transition-colors relative cursor-pointer group">
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="bg-[hsl(var(--card))] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="text-blue-500" size={28} />
            </div>
            <p className="text-sm font-bold text-[hsl(var(--foreground))]">Click or drag files here to upload</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">Supports JPG, PNG, and PDF (Max 10MB per file)</p>
          </div>

          {newFiles.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[hsl(var(--foreground))] mb-3 uppercase tracking-wider">Files to Upload</h3>
              <div className="space-y-2">
                {newFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`p-2 rounded-lg ${file.fileType === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {file.fileType === 'pdf' ? <FileIcon size={16} /> : <ImageIcon size={16} />}
                      </div>
                      <p className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">{file.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-2 text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 flex gap-3 mt-auto">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl font-bold text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || newFiles.length === 0}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Uploading...' : 'Upload Designs'}
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
};
