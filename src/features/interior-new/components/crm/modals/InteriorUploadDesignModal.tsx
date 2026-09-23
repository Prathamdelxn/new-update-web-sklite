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
  onSuccess: () => void;
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
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null);
  const [selectedFilePreviewUrl, setSelectedFilePreviewUrl] = useState<string>('');

  const isDuplicateTitleInCategory = (testTitle: string, testCategory: '2D' | '3D', ignoreId?: string): boolean => {
    const normalizedTest = testTitle.trim().toLowerCase();
    if (!normalizedTest) return false;

    // 1. Check against already saved files in this category
    const existsInUploaded = existingFiles.some((f: any) => {
      const fileCat = (f.category || '2D').toUpperCase() === '3D' ? '3D' : '2D';
      if (fileCat !== testCategory) return false;
      const fileTitle = (f.title || f.name || '').trim().toLowerCase();
      return fileTitle === normalizedTest;
    });

    if (existsInUploaded) return true;

    // 2. Check against staged files in this category
    const existsInQueue = queuedFiles.some((q) => {
      if (ignoreId && q.id === ignoreId) return false;
      if (q.category !== testCategory) return false;
      const queuedTitle = (q.title || q.name || '').trim().toLowerCase();
      return queuedTitle === normalizedTest;
    });

    return existsInQueue;
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

  // Staged / Queued files if user wants to upload multiple at once
  const [queuedFiles, setQueuedFiles] = useState<{
    id: string;
    title: string;
    name: string;
    category: '2D' | '3D';
    roomTag: string;
    fileObj: File;
    previewUrl?: string;
    fileType: string;
  }[]>([]);

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
      setSelectedFileObj(null);
      setSelectedFilePreviewUrl('');
      setQueuedFiles([]);
    }
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const detected = detectFileType(file.name);
    if (['3d-model'].includes(detected)) {
      setCategory('3D');
    }

    if (!title.trim()) {
      const sanitized = sanitizeTitle(file.name);
      setTitle(sanitized.slice(0, 50));
    }

    setSelectedFileObj(file);

    if (detected === 'image') {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedFilePreviewUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFilePreviewUrl('');
    }

    e.target.value = '';
  };

  const getEffectiveRoom = () => {
    if (roomTag === 'Other / Custom Area') {
      return customRoomInput.trim() || 'General / Not Specified';
    }
    return roomTag || 'General / Not Specified';
  };

  const handleAddCurrentToQueue = () => {
    if (!selectedFileObj) {
      toast.error('Please select a file to stage.');
      return;
    }

    const titleError = getTitleValidationError(title);
    if (titleError) {
      setTitleTouched(true);
      toast.error(titleError);
      return;
    }

    const fileType = detectFileType(selectedFileObj.name);
    const resolvedRoom = getEffectiveRoom();

    setQueuedFiles((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        title: title.trim(),
        name: selectedFileObj.name,
        category,
        roomTag: resolvedRoom,
        fileObj: selectedFileObj,
        previewUrl: selectedFilePreviewUrl,
        fileType
      }
    ]);

    // Reset inputs for next file
    setTitle('');
    setTitleTouched(false);
    setSelectedFileObj(null);
    setSelectedFilePreviewUrl('');
    toast.success('Drawing staged! You can add another drawing or click Submit.');
  };

  const removeQueuedFile = (id: string) => {
    setQueuedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Compile items to upload: either staged list OR current form inputs
    let itemsToUpload = [...queuedFiles];

    if (itemsToUpload.length === 0) {
      if (!selectedFileObj) {
        toast.error('Please choose a drawing file or 3D model to upload.');
        return;
      }

      const titleError = getTitleValidationError(title);
      if (titleError) {
        setTitleTouched(true);
        toast.error(titleError);
        return;
      }

      const fileType = detectFileType(selectedFileObj.name);
      const resolvedRoom = getEffectiveRoom();

      itemsToUpload.push({
        id: 'primary',
        title: title.trim(),
        name: selectedFileObj.name,
        category,
        roomTag: resolvedRoom,
        fileObj: selectedFileObj,
        fileType
      });
    }

    setIsSubmitting(true);

    try {
      // Upload all items to Cloudinary and structure full versioning payload
      const uploadedNewFiles = await Promise.all(
        itemsToUpload.map(async (fileData) => {
          const fileUrl = await uploadToCloudinary(fileData.fileObj);

          const initialVersion = {
            versionNumber: 1,
            name: fileData.title || fileData.name,
            url: fileUrl,
            fileType: fileData.fileType,
            category: fileData.category,
            uploadedAt: new Date(),
            approvalStatus: 'draft',
            clientStatus: 'pending_client_review'
          };

          return {
            name: fileData.name,
            title: fileData.title || fileData.name,
            url: fileUrl,
            fileType: fileData.fileType,
            category: fileData.category,
            roomTag: fileData.roomTag,
            currentVersion: 1,
            status: 'draft',
            approvalStatus: 'draft',
            versions: [initialVersion],
            uploadedAt: new Date()
          };
        })
      );

      const updatedFiles = [...existingFiles, ...uploadedNewFiles];

      await interiorCrmService.updateCustomer(customerId, {
        designFiles: updatedFiles
      });

      const fileTitlesSummary = uploadedNewFiles.map((f) => f.title).join(', ');
      await interiorCrmService.createActivity({
        customer: customerId,
        type: 'Design Shared',
        status: 'Completed',
        remarks: `Uploaded ${uploadedNewFiles.length} drawing(s): ${fileTitlesSummary}.`,
        completedDate: new Date()
      });

      toast.success(`${uploadedNewFiles.length} drawing(s) uploaded successfully!`);
      onSuccess();
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
              required={queuedFiles.length === 0}
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

          {/* File Upload Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              File Attachment <span className="text-rose-500">*</span>
            </label>

            {selectedFileObj ? (
              <div className="p-3.5 bg-slate-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 overflow-hidden">
                  {selectedFilePreviewUrl ? (
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-white shrink-0 border border-slate-200 shadow-2xs">
                      <img src={selectedFilePreviewUrl} alt={selectedFileObj.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={cn(
                      "w-11 h-11 rounded-lg flex items-center justify-center shrink-0 text-white font-medium text-xs shadow-2xs",
                      category === '3D' ? "bg-purple-600" : "bg-blue-600"
                    )}>
                      {category === '3D' ? <Box size={20} /> : <FileText size={20} />}
                    </div>
                  )}

                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-slate-900 truncate max-w-xs sm:max-w-sm">
                      {selectedFileObj.name}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                      {(selectedFileObj.size / (1024 * 1024)).toFixed(2)} MB • {detectFileType(selectedFileObj.name).toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer">
                    Change
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      accept={category === '2D' ? "image/*,application/pdf,.pdf,.dxf,.zip,.rar" : "image/*,application/pdf,.pdf,.dwg,.dxf,.skp,.obj,.fbx,.3ds,.dae,.blend,.rvt,.rfa,.ifc,.gltf,.glb,.max,.zip,.rar"}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFileObj(null);
                      setSelectedFilePreviewUrl('');
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Remove file"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/40 rounded-xl p-5 text-center transition-all relative cursor-pointer group">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept={category === '2D' ? "image/*,application/pdf,.pdf,.dxf,.zip,.rar" : "image/*,application/pdf,.pdf,.dwg,.dxf,.skp,.obj,.fbx,.3ds,.dae,.blend,.rvt,.rfa,.ifc,.gltf,.glb,.max,.zip,.rar"}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="bg-white w-10 h-10 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform text-blue-600">
                  <UploadCloud size={20} />
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  Click or drag file here to upload
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {category === '2D'
                    ? 'Supports PDF, DXF, JPG, PNG'
                    : 'Supports .DWG, SketchUp (.skp), .OBJ, .FBX, Renders'}
                </p>
              </div>
            )}
          </div>

          {/* Optional Stage to Multi-Upload Batch */}
          {selectedFileObj && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddCurrentToQueue}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100/70 border border-blue-200/60 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                <Plus size={14} /> Stage & Add Another
              </button>
            </div>
          )}

          {/* Queued Staged Files Summary */}
          {queuedFiles.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> Staged for Upload ({queuedFiles.length})
              </h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {queuedFiles.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0",
                        item.category === '3D' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {item.category}
                      </span>
                      <div className="overflow-hidden">
                        <p className="font-semibold text-slate-900 truncate">{item.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {item.roomTag} • {item.name}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQueuedFile(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              disabled={isSubmitting || (!selectedFileObj && queuedFiles.length === 0)}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                'Uploading...'
              ) : (
                <>
                  <UploadCloud size={16} />
                  {queuedFiles.length > 0
                    ? `Upload ${queuedFiles.length + (selectedFileObj ? 1 : 0)} Drawing(s)`
                    : 'Upload Drawing'}
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
