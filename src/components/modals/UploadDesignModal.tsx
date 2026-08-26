'use client';

import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  File as FileIcon,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  Eye,
  CheckCircle2,
  Box,
  FileText,
  Layers,
  Archive
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import interiorApiClient from '@/services/interiorApi.client';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadToCloudinary } from '@/lib/upload';
import { detectFileType, getFileBadgeInfo } from '@/features/interior-new/components/crm/modals/InteriorUploadDesignModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess: () => void;
  existingFiles?: any[];
}

export const UploadDesignModal = ({
  isOpen,
  onClose,
  customerId,
  onSuccess,
  existingFiles = []
}: Props) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingFileIndex, setIsDeletingFileIndex] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<any | null>(null);

  const [newFiles, setNewFiles] = useState<{
    name: string;
    url: string;
    fileType: string;
    category: string;
    fileObj?: File;
  }[]>([]);

  React.useEffect(() => {
    if (!isOpen) {
      setNewFiles([]);
      setPreviewFile(null);
      setIsDeletingFileIndex(null);
    }
  }, [isOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const type = detectFileType(file.name);
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target?.result) {
          setNewFiles((prev) => [
            ...prev,
            {
              name: file.name,
              url: event.target!.result as string,
              fileType: type,
              category,
              fileObj: file
            }
          ]);
        }
      };

      if (type === 'image') {
        reader.readAsDataURL(file);
      } else {
        setNewFiles((prev) => [
          ...prev,
          {
            name: file.name,
            url: '',
            fileType: type,
            category,
            fileObj: file
          }
        ]);
      }
    });
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingFile = async (indexToDelete: number, fileName: string) => {
    if (!confirm(`Are you sure you want to remove "${fileName}"?`)) return;

    setIsDeletingFileIndex(indexToDelete);
    try {
      const updatedFiles = existingFiles.filter((_, i) => i !== indexToDelete);
      await interiorApiClient.patch(`/crm/customers/${customerId}`, {
        designFiles: updatedFiles
      });

      toast.success('Drawing file removed successfully');
      onSuccess();
    } catch (error) {
      toast.error('Failed to remove file');
    } finally {
      setIsDeletingFileIndex(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newFiles.length === 0) {
      toast.error('Please select at least one design file or 3D model to upload.');
      return;
    }
    setIsSubmitting(true);

    try {
      const uploadedNewFiles = await Promise.all(
        newFiles.map(async (fileData) => {
          if (fileData.fileObj) {
            const cloudinaryUrl = await uploadToCloudinary(fileData.fileObj);
            return {
              name: fileData.name,
              url: cloudinaryUrl,
              fileType: fileData.fileType,
              category: fileData.category,
              uploadedAt: new Date()
            };
          }
          return fileData;
        })
      );

      const updatedFiles = [...existingFiles, ...uploadedNewFiles];

      await interiorApiClient.patch(`/crm/customers/${customerId}`, {
        designFiles: updatedFiles
      });

      await interiorApiClient.post('/crm/activities', {
        customer: customerId,
        type: 'Design Shared',
        status: 'Completed',
        remarks: `Uploaded ${newFiles.length} design files (CAD, 3D models, or renders).`,
        completedDate: new Date()
      });

      toast.success('Design files & 3D models uploaded successfully!');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] shadow-2xl"
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <UploadCloud size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                2D Drawings & 3D Models Management
              </h2>
              <p className="text-xs text-slate-500">
                Upload 2D layouts and 3D DWG/CAD models (.dwg, .skp, .obj, .blend, .rvt, renders).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> 2D Working Drawings & Layouts
              </h3>
              <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 rounded-2xl p-6 text-center transition-all relative cursor-pointer group">
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.pdf,.dxf,.zip,.rar"
                  onChange={(e) => handleFileUpload(e, '2D')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="bg-white w-12 h-12 rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud className="text-blue-500" size={22} />
                </div>
                <p className="text-xs font-bold text-slate-800">Click or Drag 2D Layouts</p>
                <p className="text-[10px] text-slate-500 mt-1">Floor plans, RCP, Electrical, PDF, JPG, PNG</p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> 3D Models, 3D DWG & Renders
              </h3>
              <div className="border-2 border-dashed border-purple-200 bg-purple-50/50 hover:bg-purple-50 rounded-2xl p-6 text-center transition-all relative cursor-pointer group">
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.pdf,.dwg,.dxf,.skp,.obj,.fbx,.3ds,.dae,.blend,.rvt,.rfa,.ifc,.gltf,.glb,.max,.zip,.rar"
                  onChange={(e) => handleFileUpload(e, '3D')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="bg-white w-12 h-12 rounded-2xl shadow-sm border border-purple-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Box className="text-purple-500" size={22} />
                </div>
                <p className="text-xs font-bold text-slate-800">Click or Drag 3D DWG / Models</p>
                <p className="text-[10px] text-slate-500 mt-1">.DWG, .SKP, .OBJ, .FBX, .BLEND, .RVT, Renders</p>
              </div>
            </div>
          </div>

          {newFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> New Files to Upload ({newFiles.length})
                </h3>
                <span className="text-[10px] font-bold text-slate-500">Ready to save</span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {newFiles.map((file, index) => {
                  const type = file.fileType || detectFileType(file.name);
                  const badge = getFileBadgeInfo(file.name, file.category);

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-2xl group transition-all"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {type === 'image' && file.url ? (
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                          </div>
                        ) : type === 'pdf' ? (
                          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-500 flex items-center justify-center shrink-0">
                            <FileText size={18} />
                          </div>
                        ) : type === '3d-model' ? (
                          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-500 flex items-center justify-center shrink-0">
                            <Box size={18} />
                          </div>
                        ) : type === 'cad' ? (
                          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-500 flex items-center justify-center shrink-0">
                            <Layers size={18} />
                          </div>
                        ) : type === 'archive' ? (
                          <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-500 flex items-center justify-center shrink-0">
                            <Archive size={18} />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-500 flex items-center justify-center shrink-0">
                            <FileIcon size={18} />
                          </div>
                        )}

                        <div className="flex flex-col overflow-hidden">
                          <p className="text-xs font-bold text-slate-800 truncate max-w-xs">{file.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${badge.color}`}>
                              {badge.label}
                            </span>
                            <span className="text-[9px] font-medium text-slate-500">{file.category} Category</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {type === 'image' && file.url && (
                          <button
                            type="button"
                            onClick={() => setPreviewFile(file)}
                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                            title="Preview image"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeNewFile(index)}
                          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Remove file"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {existingFiles && existingFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-blue-500" /> Previously Uploaded Files ({existingFiles.length})
                </h3>
                <span className="text-[10px] text-slate-500">Click open to view or download</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {existingFiles.map((file, index) => {
                  const type = file.fileType || detectFileType(file.name);
                  const badge = getFileBadgeInfo(file.name, file.category);

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl group transition-all"
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        {type === 'image' && file.url ? (
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                          </div>
                        ) : type === 'pdf' ? (
                          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-500 flex items-center justify-center shrink-0">
                            <FileText size={18} />
                          </div>
                        ) : type === '3d-model' ? (
                          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-500 flex items-center justify-center shrink-0">
                            <Box size={18} />
                          </div>
                        ) : type === 'cad' ? (
                          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-500 flex items-center justify-center shrink-0">
                            <Layers size={18} />
                          </div>
                        ) : type === 'archive' ? (
                          <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-500 flex items-center justify-center shrink-0">
                            <Archive size={18} />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-500 flex items-center justify-center shrink-0">
                            <FileIcon size={18} />
                          </div>
                        )}

                        <div className="flex flex-col overflow-hidden flex-1">
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors truncate max-w-sm flex items-center gap-1.5"
                            title="Click to open/download file"
                          >
                            {file.name || 'Drawing File'}
                            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </a>

                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${badge.color}`}>
                              {badge.label}
                            </span>
                            <span className="text-[9px] font-medium text-slate-500">
                              {file.category || 'Drawing'}
                            </span>
                            {file.uploadedAt && (
                              <span className="text-[9px] font-medium text-slate-500">
                                {new Date(file.uploadedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 ml-2">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-bold rounded-xl transition-all"
                          title="Open or download file"
                        >
                          <ExternalLink size={13} /> Open
                        </a>

                        <button
                          type="button"
                          onClick={() => handleDeleteExistingFile(index, file.name)}
                          disabled={isDeletingFileIndex === index}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50"
                          title="Delete drawing"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-4 flex gap-3 mt-auto border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || newFiles.length === 0}
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-md shadow-blue-500/20"
            >
              {isSubmitting ? 'Uploading...' : `Upload ${newFiles.length} New ${newFiles.length === 1 ? 'Drawing / Model' : 'Drawings / Models'}`}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
