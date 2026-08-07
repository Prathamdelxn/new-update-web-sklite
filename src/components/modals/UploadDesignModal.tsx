import React, { useState } from 'react';
import { X, UploadCloud, File as FileIcon, Trash2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import interiorApiClient from '@/services/interiorApi.client';
import { motion } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess: () => void;
  existingFiles?: any[];
}

export const UploadDesignModal = ({ isOpen, onClose, customerId, onSuccess, existingFiles = [] }: Props) => {
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
      // Append new files to existing files
      const updatedFiles = [...existingFiles, ...newFiles];

      await interiorApiClient.patch(`/crm/customers/${customerId}`, {
        status: 'Design Approved',
        designFiles: updatedFiles,
      });

      await interiorApiClient.post('/crm/activities', {
        customer: customerId,
        type: 'Design Shared',
        status: 'Completed',
        remarks: `Uploaded ${newFiles.length} new design files (2D/3D).`,
        completedDate: new Date()
      });

      toast.success('Design files uploaded successfully!');
      onSuccess();
      onClose();
      setNewFiles([]); // Reset
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
        className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <UploadCloud className="text-blue-600" /> Upload 2D/3D Designs
            </h2>
            <p className="text-sm text-slate-500 mt-1">Upload PDF layouts or high-res 3D renders.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          
          <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-2xl p-8 text-center hover:bg-blue-50 transition-colors relative cursor-pointer group">
            <input 
              type="file" 
              multiple 
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
              <UploadCloud className="text-blue-500" size={28} />
            </div>
            <p className="text-sm font-bold text-slate-700">Click or drag files here to upload</p>
            <p className="text-xs text-slate-500 mt-2">Supports JPG, PNG, and PDF (Max 10MB per file)</p>
          </div>

          {newFiles.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Files to Upload</h3>
              <div className="space-y-2">
                {newFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`p-2 rounded-lg ${file.fileType === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {file.fileType === 'pdf' ? <FileIcon size={16} /> : <ImageIcon size={16} />}
                      </div>
                      <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 flex gap-3 mt-auto">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || newFiles.length === 0}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Uploading...' : 'Upload Designs'}
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
};
