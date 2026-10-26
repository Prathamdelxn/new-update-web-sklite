'use client';

import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  Trash2,
  CheckCircle2,
  Box,
  FileText,
  Layers,
  Tag,
  Compass,
  Plus
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadToCloudinary } from '@/lib/upload';
import { cn } from '@/lib/utils';

export const STANDARD_ROOM_TAGS = [
  'General / Not Specified',
  'Living Room',
  'Master Bedroom',
  'Kitchen',
  'Dining Area',
  'Kids Bedroom',
  'Guest Bedroom',
  'Foyer / Entrance',
  'Balcony / Terrace',
  'Master Bathroom',
  'Common Bathroom',
  'Devotional Room',
  'Walk-in Wardrobe',
  'Home Office / Study',
  'Whole House / Entire Space',
  'Other / Custom Area'
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess?: (updatedData?: any) => void;
  existingFiles?: any[];
  users?: any[];
  requirements?: any[];
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

function sanitizeTitle(fileName: string): string {
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  return nameWithoutExt
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const InteriorUploadDesignModal = ({
  isOpen,
  onClose,
  customerId,
  onSuccess,
  existingFiles = [],
  users = [],
  requirements = []
}: Props) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [category, setCategory] = useState<'2D' | '3D'>('2D');
  const [roomTag, setRoomTag] = useState('General / Not Specified');
  const [customRoomInput, setCustomRoomInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<{
    file: File;
    previewUrl?: string;
    detectedType: string;
  }[]>([]);

  const isDuplicateTitleInCategory = (testTitle: string, testCategory: '2D' | '3D'): boolean => {
    const normalizedTest = testTitle.trim().toLowerCase();
    if (!normalizedTest) return false;

    // Check against already saved files in this category
    return existingFiles.some((f: any) => {
      const fileCat = (f.category || '2D').toUpperCase() === '3D' ? '3D' : '2D';
      if (fileCat !== testCategory) return false;
      const fileTitle = (f.title || f.name || '').trim().toLowerCase();
      return fileTitle === normalizedTest;
    });
  };

  const getTitleValidationError = (val: string, targetCategory: '2D' | '3D' = category): string | null => {
    const trimmed = val.trim();
    if (!trimmed) return 'Drawing title is required';
    if (trimmed.length < 3) return 'Drawing title must be at least 3 characters';
    if (trimmed.length > 50) return 'Drawing title cannot exceed 50 characters';

    if (isDuplicateTitleInCategory(trimmed, targetCategory)) {
      return `A ${targetCategory} drawing with title "${trimmed}" already exists. Please enter a unique title.`;
    }

    return null;
  };

  // Room Options combining customer requirements + standard list
  const availableRooms = React.useMemo(() => {
    const fromReqs = requirements
      .map((r: any) => r.roomName?.trim())
      .filter(Boolean);
    const combined = Array.from(new Set(['General / Not Specified', ...fromReqs, ...STANDARD_ROOM_TAGS]));
    return combined;
  }, [requirements]);

  const handleCategoryChange = (newCat: '2D' | '3D') => {
    setCategory(newCat);
  };

  React.useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setTitleTouched(false);
      setCategory('2D');
      setRoomTag('General / Not Specified');
      setCustomRoomInput('');
      setSelectedFiles([]);
    }
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    const newItems: { file: File; previewUrl?: string; detectedType: string }[] = [];

    // If any file is a 3D model, recommend/switch to 3D category
    const has3d = filesArray.some((f) => ['3d-model'].includes(detectFileType(f.name)));
    if (has3d) {
      setCategory('3D');
    }

    // Set initial title from first file if not yet set
    if (!title.trim() && filesArray[0]) {
      const sanitized = sanitizeTitle(filesArray[0].name);
      setTitle(sanitized.slice(0, 50));
    }

    filesArray.forEach((file) => {
      const detected = detectFileType(file.name);
      const item: { file: File; previewUrl?: string; detectedType: string } = {
        file,
        detectedType: detected
      };

      if (detected === 'image') {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setSelectedFiles((prev) =>
              prev.map((p) => (p.file === file ? { ...p, previewUrl: event.target!.result as string } : p))
            );
          }
        };
        reader.readAsDataURL(file);
      }
      newItems.push(item);
    });

    setSelectedFiles((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const getEffectiveRoom = () => {
    if (roomTag === 'Other / Custom Area') {
      return customRoomInput.trim() || 'General / Not Specified';
    }
    return roomTag || 'General / Not Specified';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      toast.error('Please choose at least one drawing file or photo to upload.');
      return;
    }

    const titleError = getTitleValidationError(title);
    if (titleError) {
      setTitleTouched(true);
      toast.error(titleError);
      return;
    }

    setIsSubmitting(true);

    try {
      const resolvedRoom = getEffectiveRoom();

      // Upload all selected files in parallel to Cloudinary
      const uploadedDrawings = await Promise.all(
        selectedFiles.map(async (fileItem, index) => {
          const fileUrl = await uploadToCloudinary(fileItem.file);

          const drawingTitle =
            selectedFiles.length === 1
              ? title.trim() || sanitizeTitle(fileItem.file.name)
              : `${title.trim() || sanitizeTitle(fileItem.file.name)} (${index + 1})`;

          const initialVersion = {
            versionNumber: 1,
            name: drawingTitle,
            url: fileUrl,
            fileType: fileItem.detectedType,
            category,
            uploadedAt: new Date(),
            approvalStatus: 'draft',
            clientStatus: 'pending_client_review'
          };

          return {
            name: fileItem.file.name,
            title: drawingTitle,
            url: fileUrl,
            fileType: fileItem.detectedType,
            category,
            roomTag: resolvedRoom,
            currentVersion: 1,
            status: 'draft',
            approvalStatus: 'draft',
            versions: [initialVersion],
            uploadedAt: new Date()
          };
        })
      );

      const updatedFiles = [...existingFiles, ...uploadedDrawings];

      await interiorCrmService.updateCustomer(customerId, {
        designFiles: updatedFiles
      });

      const summaryTitles = uploadedDrawings.map((d) => d.title).join(', ');
      await interiorCrmService.createActivity({
        customer: customerId,
        type: 'Design Shared',
        status: 'Completed',
        remarks: `Uploaded ${uploadedDrawings.length} ${category} drawing(s): ${summaryTitles}.`,
        completedDate: new Date()
      });

      toast.success(
        selectedFiles.length === 1
          ? `${category} drawing uploaded successfully!`
          : `${uploadedDrawings.length} ${category} drawings uploaded successfully!`
      );

      if (onSuccess) {
        onSuccess({ _id: customerId, designFiles: updatedFiles });
      }
      onClose();
    } catch (error) {
      console.error('Upload design files error:', error);
      toast.error('Failed to upload design files');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.15 }}
          className="bg-white border border-slate-200/90 rounded-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl my-auto"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
              <UploadCloud size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                Upload Drawing
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload 2D architectural plans, working layouts, or 3D models.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-4.5 custom-scrollbar">
          {/* Category Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Drawing Category
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleCategoryChange('2D')}
                className={cn(
                  "p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left shadow-2xs",
                  category === '2D'
                    ? "border-blue-500 bg-blue-50/70 text-blue-900 ring-1 ring-blue-500/20"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/60"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm",
                  category === '2D'
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600"
                )}>
                  <Layers size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">2D Working Drawing</p>
                  <p className="text-[11px] text-slate-500">Floor plans, RCP, Electrical, PDF, DXF</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleCategoryChange('3D')}
                className={cn(
                  "p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left shadow-2xs",
                  category === '3D'
                    ? "border-purple-500 bg-purple-50/70 text-purple-900 ring-1 ring-purple-500/20"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/60"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm",
                  category === '3D'
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600"
                )}>
                  <Box size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">3D Model / Render</p>
                  <p className="text-[11px] text-slate-500">DWG, SketchUp (.skp), Renders</p>
                </div>
              </button>
            </div>
          </div>

          {/* Drawing Title with Length Validation */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Drawing Title <span className="text-rose-500">*</span>
              </label>
              <span className={cn(
                "text-[11px] font-mono transition-colors",
                title.length > 45
                  ? "text-amber-600 font-semibold"
                  : title.length > 0 && title.trim().length < 3
                  ? "text-rose-500 font-semibold"
                  : "text-slate-400"
              )}>
                {title.length}/50
              </span>
            </div>
            <input
              type="text"
              value={title}
              maxLength={50}
              onBlur={() => setTitleTouched(true)}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!titleTouched) setTitleTouched(true);
              }}
              placeholder="e.g. Master Bedroom — False Ceiling (min 3 chars)"
              className={cn(
                "w-full h-10 px-3.5 bg-white border rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-2xs",
                titleTouched && getTitleValidationError(title)
                  ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  : "border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              )}
              required
            />
            {titleTouched && getTitleValidationError(title) && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">
                {getTitleValidationError(title)}
              </p>
            )}
          </div>

          {/* Room Selection Dropdown (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Room / Area <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
              </label>
              {roomTag === 'General / Not Specified' && (
                <span className="text-[11px] text-slate-400 font-medium">Default: General</span>
              )}
            </div>
            <select
              value={roomTag}
              onChange={(e) => setRoomTag(e.target.value)}
              className="w-full h-10 px-3.5 bg-white border border-slate-200 focus:border-blue-600 rounded-xl text-xs sm:text-sm font-medium text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-100 shadow-2xs cursor-pointer"
            >
              <option value="General / Not Specified">-- General / Not Specified --</option>
              {availableRooms
                .filter((r) => r !== 'General / Not Specified' && r !== 'Other / Custom Area')
                .map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              <option value="Other / Custom Area">Other / Custom Area...</option>
            </select>

            {roomTag === 'Other / Custom Area' && (
              <input
                type="text"
                value={customRoomInput}
                maxLength={40}
                onChange={(e) => setCustomRoomInput(e.target.value)}
                placeholder="Type custom room/area (e.g. Home Theater, Balcony Garden)"
                className="w-full h-9 px-3.5 mt-2 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-blue-100 shadow-2xs"
              />
            )}
          </div>

          {/* File Upload Dropzone & Selected Files Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                File Attachment(s) <span className="text-rose-500">*</span>
              </label>
              {selectedFiles.length > 0 && (
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
                </span>
              )}
            </div>

            {selectedFiles.length > 0 ? (
              <div className="space-y-2">
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {selectedFiles.map((item, idx) => (
                    <div
                      key={`${item.file.name}-${idx}`}
                      className="p-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-between gap-3 shadow-2xs transition-all"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {item.previewUrl ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white shrink-0 border border-slate-200 shadow-2xs">
                            <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white font-medium text-xs shadow-2xs",
                            category === '3D' ? "bg-purple-600" : "bg-blue-600"
                          )}>
                            {category === '3D' ? <Box size={18} /> : <FileText size={18} />}
                          </div>
                        )}

                        <div className="overflow-hidden">
                          <p className="text-xs font-semibold text-slate-900 truncate max-w-[220px] sm:max-w-xs">
                            {item.file.name}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                            {(item.file.size / (1024 * 1024)).toFixed(2)} MB • {item.detectedType.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Remove file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add More Files Button */}
                <div className="flex items-center justify-end pt-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100/70 border border-blue-200/60 text-blue-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs">
                    <Plus size={14} /> Add More Files
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      accept={category === '2D' ? "image/*,application/pdf,.pdf,.dxf,.zip,.rar" : "image/*,application/pdf,.pdf,.dwg,.dxf,.skp,.obj,.fbx,.3ds,.dae,.blend,.rvt,.rfa,.ifc,.gltf,.glb,.max,.zip,.rar"}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/40 rounded-xl p-5 text-center transition-all relative cursor-pointer group">
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  accept={category === '2D' ? "image/*,application/pdf,.pdf,.dxf,.zip,.rar" : "image/*,application/pdf,.pdf,.dwg,.dxf,.skp,.obj,.fbx,.3ds,.dae,.blend,.rvt,.rfa,.ifc,.gltf,.glb,.max,.zip,.rar"}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="bg-white w-10 h-10 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform text-blue-600">
                  <UploadCloud size={20} />
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  Click or drag files/photos here to upload
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Select one or multiple files (Photos, PDFs, 3D models)
                </p>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-3 flex items-center justify-end gap-2.5 mt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedFiles.length === 0}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                'Uploading...'
              ) : (
                <>
                  <UploadCloud size={16} />
                  {selectedFiles.length > 1 ? `Upload ${selectedFiles.length} Drawings` : 'Upload Drawing'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  </AnimatePresence>
  );
};
