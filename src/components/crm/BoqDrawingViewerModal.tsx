'use client';

// =============================================================================
// Sky-Lite Web — Architectural Drawing Studio Lightbox Modal
// Reusable Blueprint & Drawing Viewer with Pan, Zoom, Rotate, Dotted Grid Canvas
// =============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  ExternalLink,
  Download,
  FileCode,
  Image as ImageIcon,
  FileText,
  Layers,
  Box,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BoqDrawingAttachment {
  name: string;
  url: string;
  fileType?: string;
  category?: string;
  version?: number | string;
}

interface BoqDrawingViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: BoqDrawingAttachment | null;
  title?: string;
  leadName?: string;
  sectionTitle?: string;
}

export function BoqDrawingViewerModal({
  isOpen,
  onClose,
  attachment,
  title,
  leadName,
  sectionTitle,
}: BoqDrawingViewerModalProps) {
  // Zoom, Pan & Rotate States
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const viewportRef = useRef<HTMLDivElement>(null);

  // Reset transforms whenever a new attachment is opened
  useEffect(() => {
    if (isOpen && attachment) {
      setZoomLevel(1);
      setRotation(0);
      setPanPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen, attachment?.url]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !attachment) return null;

  const fileName = attachment.name || title || 'Drawing Attachment';
  const fileUrl = attachment.url;
  const isImageFormat =
    fileUrl.match(/\.(jpg|jpeg|png|webp|gif|svg|bmp|avif)$/i) ||
    (attachment.fileType && attachment.fileType.includes('image')) ||
    (!fileUrl.match(/\.(pdf|dwg|dxf|zip|rar)$/i) && !attachment.fileType?.includes('pdf'));

  const isPdfFormat =
    fileUrl.match(/\.pdf$/i) || (attachment.fileType && attachment.fileType.includes('pdf'));

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.25));
  const handleReset = () => {
    setZoomLevel(1);
    setRotation(0);
    setPanPosition({ x: 0, y: 0 });
  };
  const handleRotateCw = () => setRotation((prev) => (prev + 90) % 360);
  const handleRotateCcw = () => setRotation((prev) => (prev - 90 + 360) % 360);

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (!isImageFormat) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel((prev) => Math.min(prev + 0.15, 4));
    } else {
      setZoomLevel((prev) => Math.max(prev - 0.15, 0.25));
    }
  };

  // Mouse Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isImageFormat) return;
    if (e.button !== 0) return; // Only primary mouse button
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isImageFormat) return;
    setPanPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-5 bg-slate-950/80 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full h-full max-w-7xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative"
        >
          {/* Top Bar / Studio Header */}
          <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 z-20 shadow-xs">
            {/* Breadcrumb Info */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                {isPdfFormat ? (
                  <FileText size={16} />
                ) : isImageFormat ? (
                  <ImageIcon size={16} />
                ) : (
                  <FileCode size={16} />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate">
                  <span>CRM</span>
                  <span>›</span>
                  {leadName && (
                    <>
                      <span className="truncate max-w-[120px]">{leadName}</span>
                      <span>›</span>
                    </>
                  )}
                  {sectionTitle && (
                    <>
                      <span className="truncate max-w-[140px] text-blue-700 font-semibold">{sectionTitle}</span>
                      <span>›</span>
                    </>
                  )}
                  <span className="font-bold text-slate-900 truncate">{fileName}</span>
                </div>
              </div>
            </div>

            {/* Top Right Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer shadow-2xs"
                title="Open in Full Tab"
              >
                <ExternalLink size={13} className="text-slate-500" />
                <span className="hidden sm:inline">Open Tab</span>
              </a>

              <a
                href={fileUrl}
                download={fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer shadow-2xs"
                title="Download Drawing File"
              >
                <Download size={13} className="text-slate-500" />
                <span className="hidden sm:inline">Download</span>
              </a>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                title="Close viewer (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Canvas Viewport Body */}
          <div className="relative flex-1 bg-slate-100 flex items-center justify-center overflow-hidden select-none min-h-0">
            {/* Top-Left Viewport Status HUD */}
            <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-2 pointer-events-none">
              <div className="bg-white/95 border border-slate-200 px-3 py-1 rounded-lg text-slate-800 text-xs font-bold flex items-center gap-2 shadow-xs backdrop-blur-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-800 text-[11px] font-semibold">Active Drawing</span>
                {isImageFormat && (
                  <span className="text-blue-700 text-[11px] font-mono font-black ml-1 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                )}
              </div>
            </div>

            {/* Dotted Grid Interactive Canvas */}
            <div
              ref={viewportRef}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDoubleClick={handleReset}
              className={`w-full h-full flex items-center justify-center relative bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] [background-size:24px_24px] bg-slate-100 select-none overflow-hidden touch-none ${
                isImageFormat ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
              }`}
            >
              {isImageFormat ? (
                <div className="w-full h-full flex items-center justify-center p-8 overflow-hidden relative pointer-events-none">
                  <img
                    src={fileUrl}
                    alt={fileName}
                    draggable={false}
                    style={{
                      transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transformOrigin: 'center center',
                      transition: isDragging ? 'none' : 'transform 0.08s cubic-bezier(0.2, 0, 0, 1)',
                    }}
                    className="max-w-[85%] max-h-[75vh] object-contain select-none pointer-events-none will-change-transform drop-shadow-md rounded-lg"
                  />
                </div>
              ) : isPdfFormat ? (
                <div className="w-full h-full flex flex-col p-3 bg-slate-100">
                  <iframe
                    src={`${fileUrl}#toolbar=1&navpanes=0`}
                    title={fileName}
                    className="w-full h-full min-h-[500px] rounded-xl bg-white border border-slate-200 shadow-xs"
                  />
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-md max-w-md">
                  <FileCode className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-900 mb-1">{fileName}</h4>
                  <p className="text-xs text-slate-500 mb-4">
                    Direct browser 2D preview is not supported for this file type ({attachment.fileType || 'CAD/Document'}). You can download or open it in full tab.
                  </p>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download / Open File</span>
                  </a>
                </div>
              )}
            </div>

            {/* Viewport Control Dock (Bottom Center HUD) */}
            {isImageFormat && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                <div className="bg-white/95 border border-slate-200 rounded-xl p-1.5 flex items-center gap-1.5 text-slate-700 shadow-lg backdrop-blur-md">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-2.5 py-1 rounded-lg hover:bg-slate-100 text-xs font-mono font-bold text-slate-800 transition cursor-pointer min-w-[56px] text-center"
                    title="Click to Reset 100%"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </button>

                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                    title="Zoom In (+)"
                  >
                    <ZoomIn size={16} />
                  </button>

                  <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                  <button
                    type="button"
                    onClick={handleRotateCcw}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                    title="Rotate 90° Counter-Clockwise"
                  >
                    <RotateCcw size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={handleRotateCw}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                    title="Rotate 90° Clockwise"
                  >
                    <RotateCw size={16} />
                  </button>

                  <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                    title="Reset Pan & Zoom"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
