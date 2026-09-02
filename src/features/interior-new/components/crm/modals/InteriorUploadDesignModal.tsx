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
  Archive,
  Download
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadToCloudinary } from '@/lib/upload';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess: () => void;
  existingFiles?: any[];
}

export function detectFileType(fileName: string): 'image' | 'pdf' | 'cad' | '3d-model' | 'archive' | 'document' {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'tiff', 'hdr', 'exr'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['dwg', 'skp', 'obj', 'fbx', '3ds', 'dae', 'blend', 'rvt', 'rfa', 'ifc', 'gltf', 'glb', 'max'].includes(ext)) return '3d-model';
  if (['dxf'].includes(ext)) return 'cad';
  if (['zip', 'rar', '7z', 'tar'].includes(ext)) return 'archive';
  return 'document';
}

export function getFileBadgeInfo(fileName: string, category: string) {
  const ext = (fileName.split('.').pop() || '').toUpperCase();
  const type = detectFileType(fileName);

  if (ext === 'DWG') {
    return { label: '3D DWG', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' };
  }
  if (type === 'image') {
    return { label: ext || 'IMAGE', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
  }
  if (type === 'pdf') {
    return { label: 'PDF DOC', color: 'bg-red-500/10 text-red-600 border-red-500/20' };
  }
  if (type === '3d-model') {
    return { label: ext || '3D MODEL', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' };
  }
  if (type === 'cad') {
    return { label: ext || '2D CAD', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
  }
  if (type === 'archive') {
    return { label: ext || 'ARCHIVE', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' };
  }
  return { label: ext || category, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
}

export const InteriorUploadDesignModal = ({
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
        // Non-images don't need full data URL loading
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
      await interiorCrmService.updateCustomer(customerId, {
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
      // Upload all new files to Cloudinary
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

      await interiorCrmService.updateCustomer(customerId, {
        designFiles: updatedFiles
      });

      await interiorCrmService.createActivity({
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
        className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <UploadCloud size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[hsl(var(--foreground))] tracking-tight flex items-center gap-2">
                2D Drawings & 3D Models Management
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Upload CAD (.dwg, .dxf), 3D Models (.skp, .obj, .fbx, .blend, .rvt), Renders & PDFs.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-6 custom-scrollbar">
          {/* Upload Dropzones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 2D Drawings & Layouts Dropzone */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> 2D Working Drawings & Layouts
              </h3>
              <div className="border-2 border-dashed border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 rounded-2xl p-6 text-center transition-all relative cursor-pointer group">
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.pdf,.dxf,.zip,.rar"
                  onChange={(e) => handleFileUpload(e, '2D')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="bg-[hsl(var(--card))] w-12 h-12 rounded-2xl border border-blue-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud className="text-blue-500" size={22} />
                </div>
                <p className="text-xs font-bold text-[hsl(var(--foreground))]">Click or Drag 2D Layouts</p>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Floor plans, RCP, Electrical, PDF, JPG, PNG</p>
              </div>
            </div>

            {/* 3D Models, 3D DWG & Realistic Renders Dropzone */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> 3D Models, 3D DWG & Renders
              </h3>
              <div className="border-2 border-dashed border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 rounded-2xl p-6 text-center transition-all relative cursor-pointer group">
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.pdf,.dwg,.dxf,.skp,.obj,.fbx,.3ds,.dae,.blend,.rvt,.rfa,.ifc,.gltf,.glb,.max,.zip,.rar"
                  onChange={(e) => handleFileUpload(e, '3D')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="bg-[hsl(var(--card))] w-12 h-12 rounded-2xl border border-purple-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Box className="text-purple-500" size={22} />
                </div>
                <p className="text-xs font-bold text-[hsl(var(--foreground))]">Click or Drag 3D DWG / Models</p>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">.DWG, .SKP, .OBJ, .FBX, .BLEND, .RVT, Renders</p>
              </div>
            </div>
          </div>

          {/* New Files to be Uploaded */}
          {newFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> New Files to Upload ({newFiles.length})
                </h3>
                <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))]">Ready to save</span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {newFiles.map((file, index) => {
                  const type = file.fileType || detectFileType(file.name);
                  const badge = getFileBadgeInfo(file.name, file.category);

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl group transition-all"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {type === 'image' && file.url ? (
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/5 shrink-0 border border-[hsl(var(--border))]">
                            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                          </div>
                        ) : type === 'pdf' ? (
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                            <FileText size={18} />
                          </div>
                        ) : type === 'cad' ? (
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                            <Layers size={18} />
                          </div>
                        ) : type === '3d-model' ? (
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                            <Box size={18} />
                          </div>
                        ) : type === 'archive' ? (
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0">
                            <Archive size={18} />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                            <FileIcon size={18} />
                          </div>
                        )}

                        <div className="flex flex-col overflow-hidden">
                          <p className="text-xs font-bold text-[hsl(var(--foreground))] truncate max-w-xs">{file.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${badge.color}`}>
                              {badge.label}
                            </span>
                            <span className="text-[9px] font-medium text-[hsl(var(--muted-foreground))]">
                              {file.category} Category
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {type === 'image' && file.url && (
                          <button
                            type="button"
                            onClick={() => setPreviewFile(file)}
                            className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] rounded-xl transition-colors"
                            title="Preview image"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeNewFile(index)}
                          className="p-2 text-[hsl(var(--muted-foreground))] hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-colors"
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

          {/* Previously Uploaded Files Section */}
          {existingFiles && existingFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-blue-500" /> Previously Uploaded Files ({existingFiles.length})
                </h3>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Click open to view or download file</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {existingFiles.map((file, index) => {
                  const type = file.fileType || detectFileType(file.name);
                  const badge = getFileBadgeInfo(file.name, file.category);

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-2xl group transition-all"
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        {type === 'image' && file.url ? (
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/5 shrink-0 border border-[hsl(var(--border))]">
                            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                          </div>
                        ) : type === 'pdf' ? (
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                            <FileText size={18} />
                          </div>
                        ) : type === 'cad' ? (
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                            <Layers size={18} />
                          </div>
                        ) : type === '3d-model' ? (
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                            <Box size={18} />
                          </div>
                        ) : type === 'archive' ? (
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0">
                            <Archive size={18} />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                            <FileIcon size={18} />
                          </div>
                        )}

                        <div className="flex flex-col overflow-hidden flex-1">
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-[hsl(var(--foreground))] hover:text-blue-600 transition-colors truncate max-w-sm flex items-center gap-1.5"
                            title="Click to open/download file"
                          >
                            {file.name || 'Drawing File'}
                            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </a>

                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${badge.color}`}>
                              {badge.label}
                            </span>
                            <span className="text-[9px] font-medium text-[hsl(var(--muted-foreground))]">
                              {file.category || 'Drawing'}
                            </span>
                            {file.uploadedAt && (
                              <span className="text-[9px] font-medium text-[hsl(var(--muted-foreground))]">
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
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[hsl(var(--muted))] hover:bg-blue-600 hover:text-white text-[hsl(var(--foreground))] text-xs font-bold rounded-xl transition-all"
                          title="Open or download file"
                        >
                          <ExternalLink size={13} /> Open
                        </a>

                        <button
                          type="button"
                          onClick={() => handleDeleteExistingFile(index, file.name)}
                          disabled={isDeletingFileIndex === index}
                          className="p-2 text-[hsl(var(--muted-foreground))] hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-colors disabled:opacity-50"
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

          {/* Action Footer */}
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
              disabled={isSubmitting || newFiles.length === 0}
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] transition-colors disabled:opacity-50 .2)]"
            >
              {isSubmitting ? 'Uploading...' : `Upload ${newFiles.length} New ${newFiles.length === 1 ? 'Drawing / Model' : 'Drawings / Models'}`}
            </button>
          </div>
        </form>
      </motion.div>

      {/* In-Modal Lightbox Image Preview */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl max-h-[85vh] bg-[hsl(var(--card))] rounded-3xl overflow-hidden flex flex-col border border-[hsl(var(--border))]"
            >
              <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
                <p className="text-sm font-black text-[hsl(var(--foreground))] truncate max-w-md">{previewFile.name}</p>
                <div className="flex items-center gap-2">
                  <a
                    href={previewFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-[hsl(var(--accent))] rounded-xl text-xs font-bold flex items-center gap-1 text-blue-500"
                  >
                    <ExternalLink size={14} /> Open Full View
                  </a>
                  <button
                    type="button"
                    onClick={() => setPreviewFile(null)}
                    className="p-2 hover:bg-[hsl(var(--accent))] rounded-full"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="p-4 flex items-center justify-center overflow-auto max-h-[75vh]">
                {previewFile.url ? (
                  <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-[70vh] object-contain rounded-xl" />
                ) : (
                  <div className="p-12 text-center flex flex-col items-center">
                    <Box size={64} className="text-purple-500 mb-4" />
                    <p className="font-bold text-sm mb-2">{previewFile.name}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
