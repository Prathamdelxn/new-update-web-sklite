'use client';

import React, { useRef, useState } from 'react';
import { Upload, X, Loader2, CheckCircle2, Image, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CloudinaryUploadProps {
  onUpload: (url: string, publicId?: string) => void;
  accept?: string;
  uploadPreset?: string;
  label?: string;
  maxSizeMB?: number;
  className?: string;
  currentUrl?: string;
}

const UPLOAD_URL  = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_URL!;
const API_KEY     = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!;
const API_SECRET  = process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET!;
const FOLDER      = 'skylite';

async function sha1(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const CloudinaryUpload: React.FC<CloudinaryUploadProps> = ({
  onUpload,
  accept = 'image/*,application/pdf',
  uploadPreset,   // kept in props for API compat, not used
  label = 'Upload File',
  maxSizeMB = 10,
  className,
  currentUrl,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File exceeds ${maxSizeMB}MB limit`);
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const timestamp = Math.round(Date.now() / 1000);
      const signature = await sha1(`folder=${FOLDER}&timestamp=${timestamp}${API_SECRET}`);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', API_KEY);
      formData.append('timestamp', String(timestamp));
      formData.append('signature', signature);
      formData.append('folder', FOLDER);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', UPLOAD_URL);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          setUploadedUrl(data.secure_url);
          setProgress(100);
          onUpload(data.secure_url, data.public_id);
        } else {
          const err = JSON.parse(xhr.responseText || '{}');
          setError(err?.error?.message || 'Upload failed.');
        }
        setUploading(false);
      };

      xhr.onerror = () => {
        setError('Network error during upload.');
        setUploading(false);
      };

      xhr.send(formData);
    } catch {
      setError('Upload failed.');
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const isImage = uploadedUrl && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(uploadedUrl);

  return (
    <div className={cn('space-y-3', className)}>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all',
          uploading
            ? 'border-blue-300 bg-blue-50 cursor-not-allowed'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleChange}
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm font-semibold text-blue-600">Uploading... {progress}%</p>
            <div className="w-full max-w-xs h-1.5 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : uploadedUrl ? (
          <div className="flex flex-col items-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <p className="text-sm font-semibold text-emerald-600">Uploaded successfully</p>
            {isImage ? (
              <img src={uploadedUrl} alt="Preview" className="w-24 h-24 rounded-xl object-cover border border-gray-200 mt-1" />
            ) : (
              <div className="flex items-center space-x-2 px-3 py-2 bg-white rounded-xl border border-gray-200">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-slate-600 truncate max-w-[200px]">{uploadedUrl.split('/').pop()}</span>
              </div>
            )}
            <p className="text-[11px] text-slate-400">Click to replace</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 rounded-2xl bg-gray-100 border border-gray-200">
              <Upload className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">Drag & drop or click to browse</p>
              <p className="text-[11px] text-slate-400 mt-1">Max {maxSizeMB}MB</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <X className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-600 font-medium">{error}</p>
        </div>
      )}
    </div>
  );
};
