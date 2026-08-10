'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, ZoomIn, ZoomOut, Save, Undo, Redo, MapPin, Loader2,
  Trash2, Image as ImageIcon, Video, Mic, StopCircle, Play, Pause,
  MessageSquare, MicOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/services/api.client';
import { uploadToCloudinary } from '@/lib/upload';
import { useToast } from '@/providers/ToastContext';
import { useAuth } from '@/providers/AuthContext';
import { cn } from '@/lib/utils';
import { hasProjectPermission } from '@/lib/permissions';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';

interface PlanAnnotatorProps {
  document: any;
  projectId: string;
  folderId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

// Generate unique ID
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : ((r & 0x3) | 0x8)).toString(16);
  });
}

// <img> can't render PDFs — the browser just shows a broken-image icon next
// to the alt text (the filename), which is exactly what looked like a
// missing preview after uploading/updating a PDF plan. PDFs need an
// <iframe>/<object> instead.
function isPdfDoc(doc: any): boolean {
  const mime = doc?.mimeType || '';
  const name = doc?.name || doc?.url || '';
  return mime.toLowerCase().includes('pdf') || /\.pdf(\?|#|$)/i.test(name);
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2, 3, 4];

export const PlanAnnotator: React.FC<PlanAnnotatorProps> = ({
  document, projectId, folderId, isOpen, onClose, onUpdate
}) => {
  const toast = useToast();
  const { user } = useAuth();
  const { project } = useProjectContext();

  const canAnnotate = hasProjectPermission(user, project, 'annotations:create') || hasProjectPermission(user, project, 'annotations:update');
  const canDeleteAnnotation = hasProjectPermission(user, project, 'annotations:delete');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // History & Annotations
  const [history, setHistory] = useState<any[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const annotations = history[historyIndex] ?? [];

  // View state
  const [zoomIdx, setZoomIdx] = useState(2); // index 2 = scale 1
  const scale = ZOOM_STEPS[zoomIdx];
  const [isAddingPin, setIsAddingPin] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Form state
  const [editingAnn, setEditingAnn] = useState<any>(null);
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [videoUri, setVideoUri] = useState('');
  const [audioUri, setAudioUri] = useState('');
  
  // Pan state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>(''); // For playback
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen || !document) return;
    const fetchAnnotations = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/projects/${projectId}/folders/${folderId}/annotations?documentId=${document._id}`);
        if (res.data && Array.isArray(res.data)) {
          const normalized = res.data.map((ann: any) => ({
            ...ann,
            clientId: ann.clientId || ann._id
          }));
          setHistory([normalized]);
          setHistoryIndex(0);
        }
      } catch (err) {
        // silent fail if no annotations endpoint or data
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnnotations();
  }, [isOpen, document, projectId, folderId]);

  // Handle Zoom
  const zoomIn = () => setZoomIdx(i => Math.min(i + 1, ZOOM_STEPS.length - 1));
  const zoomOut = () => setZoomIdx(i => Math.max(i - 1, 0));

  // Handle History
  const pushHistory = useCallback((next: any[]) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), next]);
    setHistoryIndex(i => i + 1);
    setHasUnsaved(true);
  }, [historyIndex]);

  const undo = () => { if (historyIndex > 0) { setHistoryIndex(i => i - 1); setHasUnsaved(true); } };
  const redo = () => { if (historyIndex < history.length - 1) { setHistoryIndex(i => i + 1); setHasUnsaved(true); } };

  // Handle Canvas Interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    if (isAddingPin) {
      if (!imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      
      const newPin = {
        clientId: uuidv4(),
        documentId: document._id,
        x,
        y,
        text: '',
        imageUri: '',
        videoUri: '',
        audioUri: '',
        createdAt: new Date().toISOString(),
      };
      
      const updated = [...annotations, newPin];
      pushHistory(updated);
      openSidebar({ ...newPin, _index: updated.length - 1 });
      setIsAddingPin(false);
    } else {
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const openSidebar = (ann: any) => {
    setSelectedId(ann.clientId);
    setEditingAnn(ann);
    setText(ann.text || '');
    setImageUri(ann.imageUri || '');
    setVideoUri(ann.videoUri || '');
    setAudioUri(ann.audioUri || '');
    setAudioBlob(null);
    setAudioUrl(ann.audioUri || '');
    setIsSidebarOpen(true);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    setSelectedId(null);
    setEditingAnn(null);
    stopRecording(); // ensure mic is off
  };

  // Upload helpers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      if (type === 'image') setImageUri(url);
      else setVideoUri(url);
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach(t => t.stop()); // Stop mic
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      toast.error('Microphone access denied or unavailable');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Save annotation (uploads audio if new)
  const handleSaveAnnotation = async () => {
    let finalAudioUri = audioUri;

    if (audioBlob) {
      setIsUploading(true);
      try {
        const file = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
        finalAudioUri = await uploadToCloudinary(file);
        setAudioUri(finalAudioUri);
        setAudioBlob(null);
      } catch (err) {
        toast.error('Audio upload failed');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const updated = annotations.map((a: any) =>
      a.clientId === editingAnn.clientId
        ? { ...a, text, imageUri, videoUri, audioUri: finalAudioUri }
        : a
    );
    pushHistory(updated);
    closeSidebar();
  };

  const handleDeleteAnnotation = () => {
    const updated = annotations.filter((a: any) => a.clientId !== editingAnn.clientId);
    pushHistory(updated);
    closeSidebar();
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await api.patch(`/projects/${projectId}/folders/${folderId}/annotations`, {
        documentId: document._id,
        annotations,
      });
      setHasUnsaved(false);
      toast.success('Annotations saved');
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error('Failed to save annotations');
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 text-slate-800 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500 hover:text-slate-800" />
          </button>
          <div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Plan Annotator</p>
            <h2 className="text-base font-bold text-slate-900 truncate max-w-sm">{document?.name || 'Document'}</h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
            <button onClick={zoomOut} disabled={zoomIdx === 0} className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 text-slate-600">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold w-12 text-center text-slate-700">{Math.round(scale * 100)}%</span>
            <button onClick={zoomIn} disabled={zoomIdx === ZOOM_STEPS.length - 1} className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 text-slate-600">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-slate-200" />

          {/* Undo / Redo */}
          <div className="flex items-center gap-1">
            <button onClick={undo} disabled={historyIndex === 0} className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-200 disabled:opacity-50 transition-colors text-slate-600">
              <Undo className="w-4 h-4" />
            </button>
            <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-200 disabled:opacity-50 transition-colors text-slate-600">
              <Redo className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-slate-200" />

          {canAnnotate && (
            <button
              onClick={() => setIsAddingPin(!isAddingPin)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border',
                isAddingPin 
                  ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              )}
            >
              <MapPin className="w-4 h-4" />
              {isAddingPin ? 'Cancel Pin' : 'Add Pin'}
            </button>
          )}

          {canAnnotate && (
            <button
              onClick={handleSaveAll}
              disabled={!hasUnsaved || isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 relative overflow-hidden bg-slate-100"
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        )}

        <div
          className="absolute inset-0 flex items-center justify-center transform-gpu transition-transform duration-200"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, cursor: isAddingPin ? 'crosshair' : (isDragging ? 'grabbing' : 'grab') }}
          onMouseDown={handleMouseDown}
        >
          {document?.url && (
            <div className="relative" style={{ display: 'inline-block' }}>
              {isPdfDoc(document) ? (
                <iframe
                  ref={imageRef as any}
                  src={document.url}
                  title={document.name}
                  className="pointer-events-none select-none bg-white border-0"
                  style={{ width: 'min(80vw, 900px)', height: '80vh' }}
                />
              ) : (
                <img
                  ref={imageRef}
                  src={document.url}
                  alt={document.name}
                  className="max-w-none pointer-events-none select-none"
                  style={{ maxHeight: '80vh' }}
                />
              )}

              {/* Pins layer */}
              {annotations.map((ann: any, idx: number) => {
                const isSelected = selectedId === ann.clientId;
                return (
                  <button
                    key={ann.clientId}
                    className="absolute w-8 h-8 -ml-4 -mt-8 flex flex-col items-center group focus:outline-none"
                    style={{ left: `${ann.x * 100}%`, top: `${ann.y * 100}%` }}
                    onClick={(e) => { e.stopPropagation(); openSidebar({ ...ann, _index: idx }); }}
                  >
                    <div className={cn(
                      'absolute -top-10 px-2 py-1 rounded-lg bg-white text-slate-700 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-200 pointer-events-none z-10',
                      isSelected && 'opacity-100 bg-blue-50 text-blue-700 border-blue-200'
                    )}>
                      Pin #{idx + 1}
                      {(ann.text || ann.imageUri || ann.audioUri || ann.videoUri) && ' • Has Notes'}
                    </div>
                    <MapPin className={cn(
                      'w-8 h-8 transition-all',
                      isSelected ? 'text-blue-500 scale-125' : 'text-red-500 hover:scale-110 hover:text-red-400'
                    )} />
                    <div className="absolute top-1 text-[10px] font-black text-white">{idx + 1}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Sidebar for details */}
        <AnimatePresence>
          {isSidebarOpen && editingAnn && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="absolute right-0 top-0 bottom-0 w-96 bg-white border-l border-gray-200 z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2 text-blue-600 font-bold">
                  <MapPin className="w-5 h-5" />
                  <span>Pin #{editingAnn._index + 1}</span>
                </div>
                <button onClick={closeSidebar} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Note */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">
                    <MessageSquare className="w-3.5 h-3.5" /> Text Note
                  </label>
                  <textarea
                    rows={4}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={!canAnnotate}
                    placeholder="Describe the issue or instruction here..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none disabled:opacity-70"
                  />
                </div>

                {/* Voice Memo */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">
                    <Mic className="w-3.5 h-3.5" /> Voice Memo
                  </label>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    {audioUrl ? (
                      <div className="space-y-3">
                        <audio controls src={audioUrl} className="w-full h-10" />
                        {canAnnotate && (
                          <button onClick={() => { setAudioUrl(''); setAudioUri(''); setAudioBlob(null); }} className="text-[11px] font-bold text-red-500 hover:text-red-600">
                            Remove Audio
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        {isRecording ? (
                          <div className="flex items-center gap-4">
                            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-red-600 font-bold font-mono">{formatTime(recordingTime)}</span>
                            <button onClick={stopRecording} className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                              <StopCircle className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={startRecording}
                            disabled={!canAnnotate}
                            className="flex flex-col items-center gap-2 text-slate-500 hover:text-blue-600 disabled:opacity-50 transition-colors group"
                          >
                            <div className="p-3 rounded-full bg-gray-100 group-hover:bg-blue-50 border border-gray-200 group-hover:border-blue-200 transition-all">
                              <Mic className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-semibold">Click to Record Voice Note</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Photo Attach */}
                <div>
                  <label className="flex items-center justify-between text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">
                    <div className="flex items-center gap-2"><ImageIcon className="w-3.5 h-3.5" /> Photo</div>
                    {canAnnotate && !imageUri && (
                      <label className="text-[10px] text-blue-600 cursor-pointer hover:underline">
                        Upload
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'image')} />
                      </label>
                    )}
                  </label>
                  {imageUri ? (
                    <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                      <img src={imageUri} alt="Annotation" className="w-full h-40 object-cover" />
                      {canAnnotate && (
                        <button onClick={() => setImageUri('')} className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="h-20 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-400 font-medium">
                      {isUploading ? 'Uploading...' : 'No photo attached'}
                    </div>
                  )}
                </div>

              </div>

              {/* Sidebar Footer */}
              {(canAnnotate || canDeleteAnnotation) && (
                <div className={cn('p-5 border-t border-gray-100 bg-white grid gap-3', canAnnotate && canDeleteAnnotation ? 'grid-cols-2' : 'grid-cols-1')}>
                  {canDeleteAnnotation && (
                    <button
                      onClick={handleDeleteAnnotation}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Pin
                    </button>
                  )}
                  {canAnnotate && (
                  <button
                    onClick={handleSaveAnnotation}
                    disabled={isUploading}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Note
                  </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
