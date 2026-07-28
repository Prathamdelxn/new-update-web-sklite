'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, ZoomIn, ZoomOut, MapPin, Mic, StopCircle, ImageIcon,
  Loader2, MessageSquare, Trash2, CheckCircle2, RotateCcw,
  ChevronRight, PanelRightClose, PanelRightOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthContext';
import { useSocket } from '@/providers/SocketContext';
import { useToast } from '@/providers/ToastContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { hasProjectPermission } from '@/lib/permissions';
import api from '@/services/api.client';
import { uploadToCloudinary } from '@/lib/upload';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
  projectId?: string;
}

interface Annotation {
  _id: string;
  text: string;
  x: number;
  y: number;
  position?: { x: number; y: number };
  imageUri?: string;
  voiceNoteUri?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  [key: string]: any;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  isOpen, onClose, document, projectId,
}) => {
  const [zoom, setZoom]                     = useState(100);
  const [pinMode, setPinMode]               = useState(false);
  const [annotations, setAnnotations]       = useState<Annotation[]>([]);
  const [activePin, setActivePin]           = useState<string | null>(null);
  const [pendingPos, setPendingPos]         = useState<{ x: number; y: number } | null>(null);
  const [newText, setNewText]               = useState('');
  const [newImageUri, setNewImageUri]       = useState('');
  const [newVoiceUri, setNewVoiceUri]       = useState('');
  const [isSaving, setIsSaving]             = useState(false);
  const [isRecording, setIsRecording]       = useState(false);
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [panelOpen, setPanelOpen]           = useState(true);

  const imageRef         = useRef<HTMLImageElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const imgInputRef      = useRef<HTMLInputElement>(null);
  const textInputRef     = useRef<HTMLInputElement>(null);

  const toast = useToast();
  const { user } = useAuth();
  const { project } = useProjectContext();
  const isAdmin = hasProjectPermission(user, project, 'land:delete') || user?.role?.name === 'Admin';

  const loadAnnotations = useCallback(async () => {
    if (!projectId || !document?._id) return;
    try {
      const res = await api.get(`/projects/${projectId}/annotations?document=${document._id}`);
      setAnnotations((res.data || []).map((a: any) => ({
        ...a,
        x: a.position?.x ?? a.x ?? 0,
        y: a.position?.y ?? a.y ?? 0,
      })));
    } catch { /* silent — annotations are optional */ }
  }, [projectId, document?._id]);

  useEffect(() => {
    if (isOpen) {
      setZoom(100);
      setPinMode(false);
      setActivePin(null);
      setPendingPos(null);
      setNewText('');
      setNewImageUri('');
      setNewVoiceUri('');
      loadAnnotations();
    }
  }, [isOpen, loadAnnotations]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pinMode || !imageRef.current) return;
    e.stopPropagation();
    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setPendingPos({ x, y });
    setPinMode(false);
    setPanelOpen(true);
    setTimeout(() => textInputRef.current?.focus(), 80);
  };

  const handleSave = async () => {
    if (!pendingPos || !projectId) return;
    setIsSaving(true);
    try {
      const res = await api.post(`/projects/${projectId}/annotations`, {
        document: document._id,
        documentName: document.name,
        text: newText.trim() || '(No note)',
        position: pendingPos,
        imageUri: newImageUri || undefined,
        voiceNoteUri: newVoiceUri || undefined,
      });
      const saved = res.data;
      setAnnotations(prev => [{ ...saved, x: saved.position?.x ?? 0, y: saved.position?.y ?? 0 }, ...prev]);
      toast.success('Annotation saved');
      setNewText(''); setNewImageUri(''); setNewVoiceUri(''); setPendingPos(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save annotation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!projectId) return;
    try {
      await api.delete(`/projects/${projectId}/annotations/${id}`);
      setAnnotations(prev => prev.filter(a => a._id !== id));
      if (activePin === id) setActivePin(null);
    } catch {
      toast.error('Failed to delete annotation');
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = e => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          const url = await uploadToCloudinary(new File([blob], 'voice.webm', { type: 'audio/webm' }));
          setNewVoiceUri(url);
          toast.success('Voice note recorded');
        } catch { toast.error('Failed to upload voice note'); }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch { toast.error('Microphone access denied'); }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImg(true);
    try {
      const url = await uploadToCloudinary(file);
      setNewImageUri(url);
    } catch { toast.error('Image upload failed'); }
    finally { setIsUploadingImg(false); e.target.value = ''; }
  };

  // ── AnimatePresence wraps the conditional — this eliminates the flicker ──
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="doc-viewer-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />

          {/* Viewer card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative z-10 flex rounded-2xl overflow-hidden shadow-2xl bg-white"
            style={{ width: '95vw', maxWidth: 1120, maxHeight: '92vh', minHeight: 500 }}
            onClick={e => e.stopPropagation()}
          >
            {/* ════ LEFT: Document viewer ════ */}
            <div className="flex flex-col flex-1 min-w-0">

              {/* Header bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shrink-0 gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 text-slate-400 transition-colors shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{document?.name}</p>
                    {document?.approvalStatus && (
                      <span className={cn(
                        'text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border',
                        document.approvalStatus === 'Approved' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                        document.approvalStatus === 'Rejected' ? 'text-red-700 bg-red-50 border-red-200' :
                        document.approvalStatus === 'Pending'  ? 'text-amber-700 bg-amber-50 border-amber-200' :
                        'text-slate-500 bg-gray-100 border-gray-200'
                      )}>
                        {document.approvalStatus}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Zoom cluster */}
                  <div className="flex items-center gap-0.5 px-1.5 py-1 bg-gray-50 border border-gray-200 rounded-xl">
                    <button onClick={() => setZoom(z => Math.max(25, z - 25))} className="p-1 text-slate-400 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100">
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-bold text-gray-700 w-9 text-center">{zoom}%</span>
                    <button onClick={() => setZoom(z => Math.min(300, z + 25))} className="p-1 text-slate-400 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button onClick={() => setZoom(100)} title="Reset zoom" className="p-1.5 rounded-xl border border-gray-200 text-slate-400 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  {/* Pin mode toggle */}
                  {projectId && (
                    <button
                      onClick={() => { setPinMode(p => !p); setActivePin(null); }}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
                        pinMode
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'border-gray-200 text-slate-500 hover:text-gray-800 hover:border-gray-300 bg-white'
                      )}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      {pinMode ? 'Click to pin' : 'Add Pin'}
                    </button>
                  )}

                  {/* Annotation panel toggle */}
                  <button
                    onClick={() => setPanelOpen(p => !p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200 text-slate-500 hover:text-gray-800 bg-white hover:bg-gray-50 transition-all"
                    title={panelOpen ? 'Hide annotations' : 'Show annotations'}
                  >
                    {panelOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">Notes</span>
                    {annotations.length > 0 && (
                      <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center">
                        {annotations.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Image area */}
              <div
                className={cn(
                  'flex-1 bg-[#f0f2f5] flex items-center justify-center overflow-auto relative select-none',
                  pinMode && 'cursor-crosshair'
                )}
                onClick={handleContainerClick}
              >
                {pinMode && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <div className="flex items-center gap-2 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg animate-pulse">
                      <MapPin className="w-3.5 h-3.5" />
                      Click anywhere on the plan to place a pin
                    </div>
                  </div>
                )}

                <div
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.12s ease-out',
                    position: 'relative',
                    display: 'inline-block',
                  }}
                >
                  {document?.url ? (
                    <img
                      ref={imageRef}
                      src={document.url}
                      alt={document.name}
                      className="max-w-full object-contain rounded-xl block shadow-md"
                      style={{ maxHeight: '72vh' }}
                      draggable={false}
                    />
                  ) : (
                    <div ref={imageRef as any} className="w-80 h-64 flex items-center justify-center text-slate-300 bg-white rounded-xl border border-gray-200">
                      <DocFileSvg className="w-20 h-20" />
                    </div>
                  )}

                  {/* Pending pin (not yet saved) */}
                  {pendingPos && (
                    <div
                      className="absolute z-30 pointer-events-none"
                      style={{ left: `${pendingPos.x * 100}%`, top: `${pendingPos.y * 100}%`, transform: 'translate(-50%, -100%)' }}
                    >
                      <MapPin className="w-9 h-9 text-blue-500 drop-shadow-lg animate-bounce" style={{ fill: 'rgba(59,130,246,0.8)' }} strokeWidth={0.5} />
                    </div>
                  )}

                  {/* Saved pins */}
                  {annotations.map((ann, idx) => (
                    <div
                      key={ann._id}
                      className="absolute z-20"
                      style={{ left: `${ann.x * 100}%`, top: `${ann.y * 100}%`, transform: 'translate(-50%, -100%)', cursor: 'pointer' }}
                      onClick={e => { e.stopPropagation(); setActivePin(activePin === ann._id ? null : ann._id); setPanelOpen(true); }}
                    >
                      {activePin === ann._id && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0.5 pointer-events-none z-30">
                          <div className="bg-gray-900 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg whitespace-nowrap max-w-[200px] truncate shadow-xl">
                            {ann.text}
                          </div>
                          <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
                        </div>
                      )}
                      <div className="relative group/pin">
                        <MapPin
                          className={cn('w-8 h-8 drop-shadow-md transition-colors', activePin === ann._id ? 'text-blue-500' : 'text-red-500 group-hover/pin:text-red-400')}
                          style={{ fill: activePin === ann._id ? 'rgba(59,130,246,0.85)' : 'rgba(239,68,68,0.85)' }}
                          strokeWidth={0.5}
                        />
                        <span className="absolute top-1 left-1/2 -translate-x-1/2 text-white text-[9px] font-black leading-none">{idx + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ════ RIGHT: Annotations panel ════ */}
            <AnimatePresence>
              {panelOpen && (
                <motion.div
                  key="ann-panel"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 290, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeInOut' }}
                  className="flex flex-col border-l border-gray-100 bg-white overflow-hidden shrink-0"
                  style={{ minWidth: 0 }}
                >
                  {/* Panel header */}
                  <div className="px-4 py-3 border-b border-gray-100 shrink-0 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-sm font-bold text-gray-900 flex-1">Annotations</span>
                    {annotations.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black">
                        {annotations.length}
                      </span>
                    )}
                  </div>

                  {/* New annotation form */}
                  <AnimatePresence>
                    {pendingPos && (
                      <motion.div
                        key="new-ann-form"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden shrink-0"
                      >
                        <div className="p-3 border-b border-blue-100 bg-blue-50/50 space-y-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                              <MapPin className="w-2.5 h-2.5 text-white" />
                            </div>
                            <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider">New Pin</p>
                            <button
                              onClick={() => setPendingPos(null)}
                              className="ml-auto p-0.5 rounded text-blue-400 hover:text-blue-700 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <input
                            ref={textInputRef}
                            type="text"
                            value={newText}
                            onChange={e => setNewText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setPendingPos(null); }}
                            className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                            placeholder="Add a note..."
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={isRecording ? handleStopRecording : handleStartRecording}
                              title={isRecording ? 'Stop recording' : newVoiceUri ? 'Voice recorded ✓' : 'Record voice'}
                              className={cn(
                                'p-2 rounded-lg border transition-all shrink-0',
                                isRecording  ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' :
                                newVoiceUri  ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                                               'bg-white border-gray-200 text-slate-500 hover:border-gray-300'
                              )}
                            >
                              {isRecording ? <StopCircle className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => imgInputRef.current?.click()}
                              title={newImageUri ? 'Image attached ✓' : 'Attach image'}
                              className={cn(
                                'p-2 rounded-lg border transition-all shrink-0',
                                newImageUri ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-gray-200 text-slate-500 hover:border-gray-300'
                              )}
                            >
                              {isUploadingImg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                            </button>
                            <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImgUpload} />
                            <div className="flex-1" />
                            <button
                              onClick={handleSave}
                              disabled={isSaving}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 disabled:opacity-50 transition-all"
                            >
                              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              Save
                            </button>
                          </div>
                          {newImageUri && (
                            <div className="relative rounded-xl overflow-hidden border border-emerald-200">
                              <img src={newImageUri} alt="attached" className="w-full h-20 object-cover" />
                              <button onClick={() => setNewImageUri('')} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">✕</button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Annotation list */}
                  <div className="flex-1 overflow-y-auto">
                    {annotations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
                        <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                          <MapPin className="w-5 h-5 text-gray-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-400">No annotations yet</p>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">Use "Add Pin" above to mark important points on this plan</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {annotations.map((ann, idx) => {
                          const canDelete = isAdmin || ann.createdBy === (user as any)?._id;
                          const isActive = activePin === ann._id;
                          return (
                            <div
                              key={ann._id}
                              onClick={() => setActivePin(isActive ? null : ann._id)}
                              className={cn(
                                'p-3.5 cursor-pointer transition-colors group/ann',
                                isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                              )}
                            >
                              <div className="flex items-start gap-2.5">
                                <span className={cn(
                                  'w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                                  isActive ? 'bg-blue-600 text-white' : 'bg-red-500 text-white'
                                )}>
                                  {idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-gray-900 break-words leading-relaxed">{ann.text}</p>
                                  {ann.createdByName && (
                                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{ann.createdByName}</p>
                                  )}
                                  {(ann.imageUri || ann.voiceNoteUri) && (
                                    <div className="flex flex-col gap-1.5 mt-2">
                                      {ann.imageUri && (
                                        <img src={ann.imageUri} alt="attached" className="w-full h-16 rounded-lg object-cover border border-gray-200" />
                                      )}
                                      {ann.voiceNoteUri && (
                                        <audio controls src={ann.voiceNoteUri} className="w-full h-7" />
                                      )}
                                    </div>
                                  )}
                                </div>
                                {canDelete && (
                                  <button
                                    onClick={e => handleDelete(ann._id, e)}
                                    className="p-1 rounded-lg text-transparent group-hover/ann:text-slate-300 hover:!text-red-500 hover:bg-red-50 transition-all shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Panel footer — quick add button */}
                  {!pendingPos && projectId && (
                    <div className="p-3 border-t border-gray-100 shrink-0">
                      <button
                        onClick={() => { setPinMode(p => !p); setActivePin(null); }}
                        className={cn(
                          'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all',
                          pinMode
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-dashed border-gray-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
                        )}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        {pinMode ? 'Click on the plan to place a pin' : 'Place New Pin'}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const DocFileSvg = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
