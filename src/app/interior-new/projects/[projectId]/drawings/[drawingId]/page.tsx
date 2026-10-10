'use client';

// =============================================================================
// Sky-Lite Web — Enterprise Architectural Drawing Studio & Annotation Engine (Light Theme)
// Precision Viewport for 2D Working Drawings, Blueprints & 3D Interactive Models
// Features:
// - Premium Light Theme styling (Apple / Figma / Linear modern design system)
// - Razor-sharp Architectural Coordinate Pins with scale-invariant needle pointers
// - Multimodal Annotations: Rich Text, High-Res Image Attachments & Video Walkthroughs
// - Category Tags: Snag / Defect and Note
// - Scale-invariant counter-scaling: Pins stay crisp & perfectly sized across all zoom levels
// - Interactive Hover Callout Cards with Glassmorphism & Media Previews
// - Floating Studio Dock (Pan, Marker Drop, Focal Zoom, Rotation, Fullscreen & Audit)
// - On-demand Inspection Drawer with Filters & Revisions Log
// =============================================================================

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Layers,
  Box,
  FileText,
  Image as ImageIcon,
  RotateCw,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  XCircle,
  Clock,
  UploadCloud,
  History,
  AlertCircle,
  Sparkles,
  RotateCcw,
  Check,
  Copy,
  Loader2,
  X,
  SlidersHorizontal,
  Calendar,
  User,
  PanelRightOpen,
  PanelRightClose,
  Download,
  Eye,
  FileDown,
  GitBranch,
  MessageSquare,
  Pin,
  Video,
  Play,
  FileVideo,
  ExternalLink,
  Film,
  Camera,
  Trash2,
  Pencil,
  Paperclip,
  CheckSquare,
  AlertTriangle,
  Maximize2,
  Tag,
  Share2,
  Hand,
  MousePointer,
  HelpCircle,
  ShieldCheck,
  MapPin,
  Mic,
  MicOff,
  Volume2,
  Square,
  Music,
  Pause,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { uploadToCloudinary } from '@/lib/upload';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface AnnotationAttachment {
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'file';
  size?: number;
}

export interface DrawingAnnotation {
  id: string;
  pinNumber?: number;
  versionNumber?: number;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  text: string;
  type?: 'comment' | 'issue' | 'snag' | 'revision' | 'approved';
  attachments?: AnnotationAttachment[];
  author?: {
    name: string;
    email?: string;
    avatar?: string;
  };
  resolved?: boolean;
  createdAt: string;
}

export function detectFileType(
  fileName: string = '',
  url: string = '',
  explicitType?: string,
  category?: string
): 'image' | 'pdf' | 'cad-2d' | '3d-model' | 'archive' | 'other' {
  if (explicitType === 'image' || explicitType === 'img') return 'image';
  if (explicitType === 'pdf') return 'pdf';
  if (explicitType === '3d-model' || explicitType === '3d') return '3d-model';
  if (explicitType === 'cad' || explicitType === 'cad-2d') return 'cad-2d';
  if (explicitType === 'archive') return 'archive';

  const getExt = (str?: string) => {
    if (!str) return '';
    const clean = str.split('?')[0].split('#')[0];
    const parts = clean.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  };
  const ext = getExt(url) || getExt(fileName);
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'tiff', 'hdr', 'avif'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['dwg', 'skp', 'obj', 'fbx', '3ds', 'dae', 'blend', 'rvt', 'rfa', 'ifc', 'gltf', 'glb', 'max'].includes(ext))
    return '3d-model';
  if (['dxf'].includes(ext)) return 'cad-2d';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';

  if (url.includes('/image/upload/') || url.startsWith('data:image/') || url.includes('/images/')) return 'image';
  if (url.includes('.pdf') || url.includes('/pdf/')) return 'pdf';

  if (category === '3D') return '3d-model';
  if (category === '2D' && !['dwg', 'dxf', 'pdf', 'zip', 'rar'].includes(ext)) return 'image';

  return 'image';
}

export function getFileBadge(fileName: string = '', url: string = '', category: string = '2D', explicitType?: string) {
  const getExt = (str?: string) => {
    if (!str) return '';
    const clean = str.split('?')[0].split('#')[0];
    const parts = clean.split('.');
    return parts.length > 1 ? parts.pop()!.toUpperCase() : '';
  };
  const ext = getExt(url) || getExt(fileName);
  const type = detectFileType(fileName, url, explicitType, category);

  if (category === '3D' || type === '3d-model') {
    return {
      label: ext ? `3D ${ext}` : '3D MODEL',
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: Box,
    };
  }
  if (type === 'pdf') {
    return {
      label: 'PDF BLUEPRINT',
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: FileText,
    };
  }
  if (type === 'cad-2d') {
    return {
      label: ext || '2D CAD',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Layers,
    };
  }
  return {
    label: ext || '2D DRAWING',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: ImageIcon,
  };
}

export default function ProjectDrawingStudioPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  const projectId = (params?.projectId || params?.id || '') as string;
  const rawDrawingId = (params?.drawingId || '') as string;
  const drawingId = decodeURIComponent(rawDrawingId);

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [drawing, setDrawing] = useState<any>(null);

  // Version Selection & Side Section State
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(1);
  const [showSidePanel, setShowSidePanel] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'annotations'>('annotations');

  // 2D Viewport Pan & Zoom State
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // 2D Pan Dragging State
  const [isDragging, setIsDragging] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  // ─── ANNOTATION SYSTEM STATE ───
  const [isAnnotationMode, setIsAnnotationMode] = useState<boolean>(false);
  const [annotations, setAnnotations] = useState<DrawingAnnotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<DrawingAnnotation | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);
  const [isCreateAnnoModalOpen, setIsCreateAnnoModalOpen] = useState<boolean>(false);
  const [pendingCoords, setPendingCoords] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [filterType, setFilterType] = useState<string>('all');
  const [editingAnnoId, setEditingAnnoId] = useState<string | null>(null);
  
  // Create / Edit Annotation Form State
  const [annoText, setAnnoText] = useState('');
  const [annoType, setAnnoType] = useState<'comment' | 'issue'>('comment');
  const [annoAttachments, setAnnoAttachments] = useState<AnnotationAttachment[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  
  // Voice Recording & Interactive Player State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioFile, setRecordedAudioFile] = useState<File | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioPlaybackTime, setAudioPlaybackTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordedAudioRef = useRef<HTMLAudioElement | null>(null);

  const [isSubmittingAnno, setIsSubmittingAnno] = useState(false);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaPreviewType, setMediaPreviewType] = useState<'image' | 'video' | 'audio' | 'file' | null>(null);

  // 3D Viewport State
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading3D, setLoading3D] = useState(false);
  const [loading3DProgress, setLoading3DProgress] = useState(0);
  const [load3DError, setLoad3DError] = useState<string | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isWireframe, setIsWireframe] = useState(false);
  const [bgColor, setBgColor] = useState('#f8fafc');

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const currentModelRef = useRef<THREE.Object3D | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Revision Modal State
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revChanges, setRevChanges] = useState('');
  const [selectedRevFile, setSelectedRevFile] = useState<File | null>(null);
  const [isSubmittingRev, setIsSubmittingRev] = useState(false);

  // Fetch Project Details
  const { data: projectDetails } = useQuery({
    queryKey: ['interior-project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await interiorProjectService.getProjectDetails(projectId);
      return res?.success && res?.data ? res.data : null;
    },
    enabled: Boolean(projectId),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Project Drawings
  const {
    data: drawingsList = [],
    refetch: refetchDrawings,
    isLoading: isDrawingsLoading,
  } = useQuery({
    queryKey: ['interior-project-drawings', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await interiorProjectService.getDrawings(projectId);
      return res?.success && res?.data ? res.data : Array.isArray(res) ? res : [];
    },
    enabled: Boolean(projectId),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (projectDetails) {
      setProject(projectDetails);
    }
  }, [projectDetails]);

  useEffect(() => {
    if (drawingsList.length > 0 && drawingId) {
      const found = drawingsList.find(
        (d: any, idx: number) =>
          String(d._id) === String(drawingId) ||
          String(d.id) === String(drawingId) ||
          d.drawingNumber === drawingId ||
          d.title === drawingId ||
          String(idx) === String(drawingId)
      );

      if (found) {
        setDrawing(found);
        const revs = found.revisions || [];
        const highestVer = revs.length > 0 ? revs.length : 1;
        setSelectedVersionNum((prev) => prev || highestVer);
        if (Array.isArray(found.annotations)) {
          setAnnotations(found.annotations);
        }
      }
      setLoading(false);
    } else if (!isDrawingsLoading) {
      setLoading(false);
    }
  }, [drawingsList, drawingId, isDrawingsLoading]);

  // Compile Normalized Versions List
  const allVersions = useMemo(() => {
    if (!drawing) return [];
    const revs: any[] = Array.isArray(drawing.revisions) && drawing.revisions.length > 0 ? [...drawing.revisions] : [];

    if (revs.length === 0) {
      revs.push({
        versionNumber: 1,
        revision: 'Rev 0',
        name: drawing.title || 'Drawing Blueprint',
        url: drawing.fileUrl || drawing.url,
        fileType: drawing.fileType,
        changes: 'Initial working drawing upload',
        uploadedAt: drawing.createdAt || drawing.uploadedAt,
        status: drawing.status || 'draft',
      });
    }

    return revs.map((r: any, idx: number) => ({
      versionNumber: r.versionNumber || idx + 1,
      revision: r.revision || `Rev ${idx}`,
      name: drawing.title || `Revision ${idx + 1}`,
      url: r.url || r.fileUrl || drawing.fileUrl || drawing.url,
      fileType: r.fileType || drawing.fileType,
      changes: r.changes || (idx === 0 ? 'Initial release' : `Revision ${idx}`),
      uploadedAt: r.uploadedAt || r.createdAt || drawing.createdAt,
      uploadedBy: r.uploadedBy?.name || r.uploadedByName || 'Project Engineer',
      status: r.status || drawing.status || 'draft',
    }));
  }, [drawing]);

  const activeVersion = useMemo(() => {
    return allVersions.find((v) => v.versionNumber === selectedVersionNum) || allVersions[allVersions.length - 1];
  }, [allVersions, selectedVersionNum]);

  const activeUrl = activeVersion?.url || '';
  const activeTitle = drawing?.title || activeVersion?.name || 'Architectural Blueprint';
  const activeVersionNum = activeVersion?.versionNumber || 1;
  const activeStatus = drawing?.status || activeVersion?.status || 'approved';

  function detectExt(str?: string) {
    if (!str) return '';
    const clean = str.split('?')[0];
    const parts = clean.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  }

  const explicitType = activeVersion?.fileType || drawing?.fileType;
  const effectiveCategory = drawing?.drawingType || '2D';
  const fileType = detectFileType(activeTitle, activeUrl, explicitType, effectiveCategory);
  const badgeInfo = getFileBadge(activeTitle, activeUrl, effectiveCategory, explicitType);
  const isDirect3DFormat = ['fbx', 'obj', 'gltf', 'glb'].includes(detectExt(activeUrl) || detectExt(activeTitle));
  const isImageFormat = fileType === 'image';

  // Filter annotations for the active drawing in chronological order
  const currentVersionAnnotations = useMemo(() => {
    let list = annotations.filter((a) => {
      if (!a.versionNumber) return true;
      if (allVersions.length <= 1) return true;
      return Number(a.versionNumber) === Number(activeVersionNum);
    });
    list.sort((a, b) => {
      if (a.pinNumber && b.pinNumber) return a.pinNumber - b.pinNumber;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    if (filterType === 'open') list = list.filter((a) => !a.resolved);
    if (filterType === 'resolved') list = list.filter((a) => a.resolved);
    if (filterType === 'media') list = list.filter((a) => a.attachments && a.attachments.length > 0);
    return list;
  }, [annotations, activeVersionNum, allVersions.length, filterType]);

  // 3D Model Rendering Engine
  useEffect(() => {
    if (!activeUrl || !isDirect3DFormat || !mountRef.current) return;

    setLoading3D(true);
    setLoading3DProgress(0);
    setLoad3DError(null);

    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 550;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(100, 100, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = isAutoRotating;
    controls.autoRotateSpeed = 1.2;
    controlsRef.current = controls;

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
    keyLight.position.set(100, 200, 100);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x90b0ff, 0.6);
    fillLight.position.set(-100, 100, -100);
    scene.add(fillLight);

    const gridHelper = new THREE.GridHelper(200, 40, 0x6366f1, 0xcbd5e1);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    const ext = detectExt(activeUrl) || detectExt(activeTitle);

    const fitCameraToObject = (object: THREE.Object3D) => {
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.8;
      cameraZ = Math.max(cameraZ, 20);

      camera.position.set(center.x + cameraZ * 0.7, center.y + cameraZ * 0.6, center.z + cameraZ * 0.7);
      camera.lookAt(center);
      controls.target.copy(center);
      controls.update();
    };

    const handleModelLoaded = (obj: THREE.Object3D) => {
      currentModelRef.current = obj;
      scene.add(obj);
      fitCameraToObject(obj);
      setLoading3D(false);
    };

    const handleError = (err: any) => {
      console.error('3D Load error', err);
      setLoad3DError('Could not render 3D preview in browser.');
      setLoading3D(false);
    };

    const onProgress = (xhr: ProgressEvent) => {
      if (xhr.lengthComputable) {
        setLoading3DProgress(Math.round((xhr.loaded / xhr.total) * 100));
      }
    };

    if (ext === 'fbx') {
      const loader = new FBXLoader();
      loader.load(activeUrl, handleModelLoaded, onProgress, handleError);
    } else if (ext === 'obj') {
      const loader = new OBJLoader();
      loader.load(activeUrl, handleModelLoaded, onProgress, handleError);
    } else if (ext === 'gltf' || ext === 'glb') {
      const loader = new GLTFLoader();
      loader.load(activeUrl, (gltf) => handleModelLoaded(gltf.scene), onProgress, handleError);
    } else {
      setLoad3DError(`Preview unavailable for .${ext.toUpperCase()} files.`);
      setLoading3D(false);
    }

    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, camera);
      }
    };
    animate();

    const handleResize = () => {
      if (!container || !rendererRef.current) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (rendererRef.current?.domElement) {
        rendererRef.current.dispose();
      }
      container.innerHTML = '';
    };
  }, [activeUrl, isDirect3DFormat, bgColor]);

  const viewport2DRef = useRef<HTMLDivElement>(null);

  // Wheel Zoom toward cursor focal point
  useEffect(() => {
    const el = viewport2DRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      if (!isImageFormat) return;
      e.preventDefault();
      e.stopPropagation();

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;

      setZoomLevel((prevZoom) => {
        const newZoom = Math.min(10, Math.max(0.1, Number((prevZoom * zoomFactor).toFixed(3))));
        const rect = el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;

        const scaleChange = newZoom / prevZoom;
        setPanPosition((prevPan) => ({
          x: mouseX - (mouseX - prevPan.x) * scaleChange,
          y: mouseY - (mouseY - prevPan.y) * scaleChange,
        }));

        return newZoom;
      });
    };

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleNativeWheel);
    };
  }, [isImageFormat]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !isImageFormat) return;
    if (isAnnotationMode) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetViewport = () => {
    setZoomLevel(1);
    setRotation(0);
    setPanPosition({ x: 0, y: 0 });
  };

  function formatAudioTime(seconds: number) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  // ─── ANNOTATION CLICK & EDIT HANDLERS ───
  const handleStartEditAnnotation = (anno: DrawingAnnotation) => {
    cancelAudioRecording();
    setEditingAnnoId(anno.id);
    setAnnoText(anno.text || '');
    setAnnoType(anno.type === 'issue' || anno.type === 'snag' ? 'issue' : 'comment');

    const audioAtt = Array.isArray(anno.attachments) ? anno.attachments.find((a) => a.type === 'audio') : null;
    if (audioAtt) {
      setRecordedAudioUrl(audioAtt.url);
      setRecordedAudioFile(null);
      setAudioPlaybackTime(0);
      setIsPlayingAudio(false);
    } else {
      setRecordedAudioUrl(null);
      setRecordedAudioFile(null);
      setAudioPlaybackTime(0);
      setIsPlayingAudio(false);
    }

    setAnnoAttachments(Array.isArray(anno.attachments) ? [...anno.attachments] : []);
    setPendingCoords({ x: anno.x, y: anno.y });
    setSelectedAnnotation(null);
    setIsCreateAnnoModalOpen(true);
    setIsAnnotationMode(false);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isAnnotationMode || !imageRef.current) return;
    e.stopPropagation();
    cancelAudioRecording();

    const rect = imageRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = Math.max(0, Math.min(100, Number(((clickX / rect.width) * 100).toFixed(2))));
    const yPercent = Math.max(0, Math.min(100, Number(((clickY / rect.height) * 100).toFixed(2))));

    setPendingCoords({ x: xPercent, y: yPercent });
    setEditingAnnoId(null);
    setAnnoText('');
    setAnnoType('comment');
    setRecordedAudioUrl(null);
    setRecordedAudioFile(null);
    setAudioPlaybackTime(0);
    setIsPlayingAudio(false);
    setAnnoAttachments([]);
    setIsCreateAnnoModalOpen(true);
    setIsAnnotationMode(false);
  };

  // ─── MEDIA UPLOAD HANDLERS ───
  const handleImageAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      let fileUrl = '';
      try {
        fileUrl = await uploadToCloudinary(file);
      } catch (err) {
        console.warn('Cloudinary upload fallback to local URL', err);
        fileUrl = URL.createObjectURL(file);
      }

      setAnnoAttachments((prev) => [
        ...prev,
        {
          name: file.name,
          url: fileUrl,
          type: 'image',
          size: file.size,
        },
      ]);
      toast.success('Photo attached');
    } catch (err: any) {
      toast.error('Failed to attach image');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleVideoAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingVideo(true);
      let fileUrl = '';
      try {
        fileUrl = await uploadToCloudinary(file);
      } catch (err) {
        console.warn('Cloudinary video upload fallback to local URL', err);
        fileUrl = URL.createObjectURL(file);
      }

      setAnnoAttachments((prev) => [
        ...prev,
        {
          name: file.name,
          url: fileUrl,
          type: 'video',
          size: file.size,
        },
      ]);
      toast.success('Video attached');
    } catch (err: any) {
      toast.error('Failed to attach video');
    } finally {
      setIsUploadingVideo(false);
      e.target.value = '';
    }
  };

  const startAudioRecording = async () => {
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        toast.error('Voice recording is not supported in this browser environment');
        return;
      }

      if (recordedAudioRef.current) {
        recordedAudioRef.current.pause();
      }
      setIsPlayingAudio(false);
      setAudioPlaybackTime(0);
      setRecordedAudioUrl(null);
      setRecordedAudioFile(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(200);
      setIsRecordingAudio(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      toast.error(err?.message || 'Microphone access denied or unavailable');
    }
  };

  const stopAudioRecording = () => {
    if (!mediaRecorderRef.current) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const duration = recordingDuration;
    setIsRecordingAudio(false);

    mediaRecorderRef.current.onstop = () => {
      try {
        const mime = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([audioBlob], `voice-note-${Date.now()}.${ext}`, { type: mime });
        const localUrl = URL.createObjectURL(audioBlob);

        setRecordedAudioFile(file);
        setRecordedAudioUrl(localUrl);
        setAudioDuration(duration || 1);
        setAudioPlaybackTime(0);
        setIsPlayingAudio(false);

        toast.success('Audio recorded! Click Play to listen.');
      } catch (err: any) {
        toast.error('Failed to process recorded audio');
      } finally {
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        }
      }
    };

    mediaRecorderRef.current.stop();
  };

  const cancelAudioRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (recordedAudioRef.current) {
      recordedAudioRef.current.pause();
    }
    audioChunksRef.current = [];
    setIsRecordingAudio(false);
    setIsPlayingAudio(false);
    setRecordingDuration(0);
  };

  const togglePlayRecordedAudio = () => {
    if (!recordedAudioRef.current) return;
    if (isPlayingAudio) {
      recordedAudioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      recordedAudioRef.current
        .play()
        .then(() => {
          setIsPlayingAudio(true);
        })
        .catch((err) => {
          console.error('Audio play error:', err);
        });
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!recordedAudioRef.current) return;
    setAudioPlaybackTime(recordedAudioRef.current.currentTime);
  };

  const handleAudioLoadedMetadata = () => {
    if (!recordedAudioRef.current) return;
    if (recordedAudioRef.current.duration && !isNaN(recordedAudioRef.current.duration) && isFinite(recordedAudioRef.current.duration)) {
      setAudioDuration(recordedAudioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlayingAudio(false);
    setAudioPlaybackTime(0);
  };

  const handleAudioSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!recordedAudioRef.current) return;
    const dur = audioDuration || recordingDuration || 1;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newFraction = Math.max(0, Math.min(1, clickX / rect.width));
    recordedAudioRef.current.currentTime = newFraction * dur;
    setAudioPlaybackTime(recordedAudioRef.current.currentTime);
  };

  const handleReRecordAudio = () => {
    if (recordedAudioRef.current) {
      recordedAudioRef.current.pause();
    }
    setIsPlayingAudio(false);
    setAudioPlaybackTime(0);
    setRecordedAudioUrl(null);
    setRecordedAudioFile(null);
    setAudioDuration(0);
    startAudioRecording();
  };

  const handleDeleteRecordedAudio = () => {
    if (recordedAudioRef.current) {
      recordedAudioRef.current.pause();
    }
    setIsPlayingAudio(false);
    setAudioPlaybackTime(0);
    setRecordedAudioUrl(null);
    setRecordedAudioFile(null);
    setAudioDuration(0);
    setAnnoAttachments((prev) => prev.filter((a) => a.type !== 'audio'));
    toast.success('Voice note removed');
  };

  const handleSaveAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annoText.trim() && annoAttachments.length === 0 && !recordedAudioFile && !recordedAudioUrl) {
      toast.error('Please enter an observation note, record voice, or attach media');
      return;
    }

    try {
      setIsSubmittingAnno(true);

      // Prepare final attachments list including recorded voice note
      let effectiveAttachments = [...annoAttachments];

      if (recordedAudioFile) {
        try {
          const uploadedUrl = await uploadToCloudinary(recordedAudioFile);
          const durStr = formatAudioTime(audioDuration || recordingDuration || 1);
          effectiveAttachments = effectiveAttachments.filter((a) => a.type !== 'audio');
          effectiveAttachments.push({
            name: `Voice Note (${durStr})`,
            url: uploadedUrl,
            type: 'audio',
            size: recordedAudioFile.size,
          });
        } catch (err) {
          console.warn('Fallback saving local audio url', err);
          if (recordedAudioUrl) {
            effectiveAttachments = effectiveAttachments.filter((a) => a.type !== 'audio');
            effectiveAttachments.push({
              name: `Voice Note (${formatAudioTime(audioDuration || recordingDuration || 1)})`,
              url: recordedAudioUrl,
              type: 'audio',
              size: recordedAudioFile.size,
            });
          }
        }
      } else if (!recordedAudioUrl) {
        // If voice note was deleted by user
        effectiveAttachments = effectiveAttachments.filter((a) => a.type !== 'audio');
      }

      let updatedList: DrawingAnnotation[];
      let targetPinNumber: number;

      if (editingAnnoId) {
        const existing = annotations.find((a) => a.id === editingAnnoId);
        targetPinNumber = existing?.pinNumber || 1;
        updatedList = annotations.map((a) => {
          if (a.id === editingAnnoId) {
            return {
              ...a,
              text: annoText.trim(),
              type: annoType,
              attachments: effectiveAttachments,
            };
          }
          return a;
        });
      } else {
        const currentVers = annotations.filter((a) => !a.versionNumber || Number(a.versionNumber) === Number(activeVersionNum));
        targetPinNumber = currentVers.reduce((max, a) => Math.max(max, a.pinNumber || 0), 0) + 1;

        const newAnno: DrawingAnnotation = {
          id: `anno-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          pinNumber: targetPinNumber,
          versionNumber: activeVersionNum,
          x: pendingCoords.x,
          y: pendingCoords.y,
          text: annoText.trim(),
          type: annoType,
          attachments: effectiveAttachments,
          author: {
            name: 'Site Architect',
            email: 'architect@interior-os.com',
          },
          resolved: false,
          createdAt: new Date().toISOString(),
        };

        updatedList = [...annotations, newAnno];
      }

      const targetDrawingId = drawing?._id || drawing?.id || drawingId;
      if (targetDrawingId) {
        await interiorProjectService.updateDrawing(projectId, {
          drawingId: String(targetDrawingId),
          annotations: updatedList,
        });
        queryClient.setQueryData(['interior-project-drawings', projectId], (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map((d: any) =>
            String(d._id) === String(targetDrawingId) ||
            String(d.id) === String(targetDrawingId) ||
            d.drawingNumber === targetDrawingId ||
            d.title === targetDrawingId
              ? { ...d, annotations: updatedList }
              : d
          );
        });
      }

      setAnnotations(updatedList);
      setDrawing((prev: any) => (prev ? { ...prev, annotations: updatedList } : prev));
      cancelAudioRecording();
      setRecordedAudioUrl(null);
      setRecordedAudioFile(null);
      setIsCreateAnnoModalOpen(false);
      const wasEditing = editingAnnoId;
      setEditingAnnoId(null);
      setAnnoText('');
      setAnnoAttachments([]);
      setFilterType('all');
      setShowSidePanel(true);
      setActiveTab('annotations');

      if (wasEditing) {
        setHoveredAnnotationId(wasEditing);
        setTimeout(() => {
          setHoveredAnnotationId((curr) => (curr === wasEditing ? null : curr));
        }, 3000);
        toast.success(`Inspection Pin #${targetPinNumber} updated`);
      } else {
        const createdId = updatedList[updatedList.length - 1]?.id;
        if (createdId) {
          setHoveredAnnotationId(createdId);
          setTimeout(() => {
            setHoveredAnnotationId((curr) => (curr === createdId ? null : curr));
          }, 3000);
        }
        toast.success(`Inspection Pin #${targetPinNumber} placed`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save annotation');
    } finally {
      setIsSubmittingAnno(false);
    }
  };

  const handleDeleteAnnotation = async (annoId: string) => {
    const confirmed = await confirm({
      title: 'Delete Inspection Pin',
      message: 'Are you sure you want to permanently remove this pin and all attached photos/videos?',
      confirmText: 'Delete Pin',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      const updatedList = annotations.filter((a) => a.id !== annoId);
      const targetDrawingId = drawing?._id || drawing?.id || drawingId;
      if (targetDrawingId) {
        await interiorProjectService.updateDrawing(projectId, {
          drawingId: String(targetDrawingId),
          annotations: updatedList,
        });
        queryClient.setQueryData(['interior-project-drawings', projectId], (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map((d: any) =>
            String(d._id) === String(targetDrawingId) ||
            String(d.id) === String(targetDrawingId) ||
            d.drawingNumber === targetDrawingId ||
            d.title === targetDrawingId
              ? { ...d, annotations: updatedList }
              : d
          );
        });
      }
      setAnnotations(updatedList);
      setDrawing((prev: any) => (prev ? { ...prev, annotations: updatedList } : prev));
      if (selectedAnnotation?.id === annoId) setSelectedAnnotation(null);
      toast.success('Pin removed');
    } catch (err: any) {
      toast.error('Failed to delete annotation');
    }
  };

  const handleToggleResolve = async (annoId: string) => {
    try {
      const updatedList = annotations.map((a) => {
        if (a.id === annoId) return { ...a, resolved: !a.resolved };
        return a;
      });

      const targetDrawingId = drawing?._id || drawing?.id || drawingId;
      if (targetDrawingId) {
        await interiorProjectService.updateDrawing(projectId, {
          drawingId: String(targetDrawingId),
          annotations: updatedList,
        });
        queryClient.setQueryData(['interior-project-drawings', projectId], (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map((d: any) =>
            String(d._id) === String(targetDrawingId) ||
            String(d.id) === String(targetDrawingId) ||
            d.drawingNumber === targetDrawingId ||
            d.title === targetDrawingId
              ? { ...d, annotations: updatedList }
              : d
          );
        });
      }
      setAnnotations(updatedList);
      setDrawing((prev: any) => (prev ? { ...prev, annotations: updatedList } : prev));
      if (selectedAnnotation?.id === annoId) {
        setSelectedAnnotation((prev) => (prev ? { ...prev, resolved: !prev.resolved } : null));
      }
      toast.success('Status updated');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const targetDrawingId = drawing?._id || drawing?.id || drawingId;
    if (!targetDrawingId) return;
    try {
      const res = await interiorProjectService.updateDrawing(projectId, {
        drawingId: String(targetDrawingId),
        status: newStatus,
      });
      if (res.success) {
        toast.success(`Status updated: ${newStatus.replace('_', ' ').toUpperCase()}`);
        setDrawing((prev: any) => ({ ...prev, status: newStatus }));
        queryClient.invalidateQueries({ queryKey: ['interior-project-drawings', projectId] });
        refetchDrawings();
      }
    } catch (err: any) {
      toast.error('Failed to update status');
    }
  };

  const handleUploadRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revChanges.trim()) {
      toast.error('Please describe what changed in this revision');
      return;
    }
    if (!selectedRevFile) {
      toast.error('Please select a revision file');
      return;
    }

    try {
      setIsSubmittingRev(true);
      const formData = new FormData();
      formData.append('file', selectedRevFile);

      const uploadRes = await interiorProjectService.uploadDrawingFile(projectId, formData);
      if (!uploadRes.success || !uploadRes.data?.url) {
        throw new Error('Revision upload failed');
      }

      const fileUrl = uploadRes.data.url;
      const fileType = detectFileType(selectedRevFile.name, fileUrl);
      const targetDrawingId = drawing?._id || drawing?.id || drawingId;

      const res = await interiorProjectService.updateDrawing(projectId, {
        drawingId: String(targetDrawingId),
        revisionName: `Rev ${allVersions.length}`,
        changes: revChanges.trim(),
        fileUrl,
        fileType,
      });

      if (res.success) {
        toast.success('New revision uploaded successfully!');
        setIsRevisionModalOpen(false);
        setRevChanges('');
        setSelectedRevFile(null);
        queryClient.invalidateQueries({ queryKey: ['interior-project-drawings', projectId] });
        await refetchDrawings();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to upload revision');
    } finally {
      setIsSubmittingRev(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success('Drawing viewport link copied');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const getStatusPill = (st: string) => {
    switch (st) {
      case 'approved':
        return {
          label: 'Approved',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: CheckCircle2,
        };
      case 'under_review':
      case 'submitted':
        return {
          label: 'Under Review',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          icon: Clock,
        };
      case 'rejected':
        return {
          label: 'Changes Requested',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          icon: XCircle,
        };
      default:
        return {
          label: 'Draft',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          icon: Layers,
        };
    }
  };

  const statusPill = getStatusPill(activeStatus);

  // Professional Architectural Color Themes
  const getAnnoTheme = (type?: string) => {
    switch (type) {
      case 'issue':
      case 'snag':
        return {
          label: 'Snag / Defect',
          gradient: 'from-rose-500 to-red-600',
          bg: 'bg-rose-600',
          text: 'text-rose-600',
          lightBg: 'bg-rose-50 border-rose-200 text-rose-700',
          glow: 'shadow-rose-500/40',
          ring: 'ring-rose-400/40',
          beacon: 'bg-rose-500',
          tipColor: '#e11d48',
          icon: AlertTriangle,
        };
      case 'revision':
        return {
          label: 'Revision Note',
          gradient: 'from-amber-500 to-orange-600',
          bg: 'bg-amber-500',
          text: 'text-amber-600',
          lightBg: 'bg-amber-50 border-amber-200 text-amber-700',
          glow: 'shadow-amber-500/40',
          ring: 'ring-amber-400/40',
          beacon: 'bg-amber-500',
          tipColor: '#f59e0b',
          icon: GitBranch,
        };
      case 'approved':
        return {
          label: 'Approved Mark',
          gradient: 'from-emerald-500 to-teal-600',
          bg: 'bg-emerald-600',
          text: 'text-emerald-600',
          lightBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          glow: 'shadow-emerald-500/40',
          ring: 'ring-emerald-400/40',
          beacon: 'bg-emerald-500',
          tipColor: '#059669',
          icon: CheckSquare,
        };
      default:
        return {
          label: 'Inspection Note',
          gradient: 'from-blue-600 to-indigo-600',
          bg: 'bg-blue-600',
          text: 'text-blue-600',
          lightBg: 'bg-blue-50 border-blue-200 text-blue-700',
          glow: 'shadow-blue-500/40',
          ring: 'ring-blue-400/40',
          beacon: 'bg-blue-500',
          tipColor: '#2563eb',
          icon: MessageSquare,
        };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] gap-3 font-sans bg-white text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs font-mono font-bold tracking-wider uppercase text-slate-500">Loading Architectural Studio...</p>
      </div>
    );
  }

  if (!drawing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center max-w-md mx-auto space-y-4 font-sans">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <Layers size={32} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Drawing Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">This drawing blueprint may have been removed or renamed.</p>
        </div>
        <Link
          href={`/interior-new/projects/${projectId}/drawings`}
          className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs"
        >
          Back to Drawings Register
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden bg-white select-none font-sans text-slate-800">
      {/* ── 1. Top Enterprise Architectural Header (Light Theme) ── */}
      <header className="h-14 border-b border-slate-200/90 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-40 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/interior-new/projects/${projectId}/drawings`}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95 border border-slate-200 shrink-0"
            title="Back to Project Drawings"
          >
            <ArrowLeft size={16} />
          </Link>

          <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 min-w-0">
            <Link href="/interior-new/projects" className="hover:text-slate-900 transition-colors shrink-0">
              Projects
            </Link>
            <span className="text-slate-300">›</span>
            <Link
              href={`/interior-new/projects/${projectId}`}
              className="hover:text-slate-900 transition-colors truncate max-w-[120px] sm:max-w-[180px]"
            >
              {project?.name || 'Project'}
            </Link>
            <span className="text-slate-300">›</span>
            <Link
              href={`/interior-new/projects/${projectId}/drawings`}
              className="hover:text-slate-900 transition-colors shrink-0"
            >
              2D/3D Drawings
            </Link>
            <span className="text-slate-300">›</span>
            <span className="text-slate-900 font-bold truncate max-w-[160px] sm:max-w-[280px]">
              {activeTitle}
            </span>
          </nav>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2 shrink-0">

          <button
            onClick={() => {
              setShowSidePanel(!showSidePanel);
              setActiveTab('annotations');
            }}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border shadow-xs cursor-pointer',
              showSidePanel && activeTab === 'annotations'
                ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <MessageSquare size={14} />
            <span>Pins ({currentVersionAnnotations.length})</span>
          </button>

          <button
            onClick={() => {
              setShowSidePanel(!showSidePanel);
              setActiveTab('history');
            }}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border shadow-xs cursor-pointer',
              showSidePanel && activeTab === 'history'
                ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <History size={14} />
            <span>Audit ({allVersions.length})</span>
          </button>
        </div>
      </header>

      {/* ── 2. Sub-Header: Versions Ribbon & Status Tag ── */}
      <div className="h-11 border-b border-slate-200/80 bg-slate-50/70 px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 overflow-x-auto scrollbar-none">
        {/* Left: Versions Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mr-1">
            <Layers size={13} className="text-slate-400" /> Revisions:
          </span>

          <div className="flex items-center gap-1.5">
            {allVersions.map((ver, idx) => {
              const isSelected = ver.versionNumber === selectedVersionNum;
              const isLatest = idx === allVersions.length - 1;

              return (
                <button
                  key={ver.versionNumber}
                  onClick={() => setSelectedVersionNum(ver.versionNumber)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer',
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      ver.status === 'approved' ? 'bg-emerald-400' : 'bg-blue-400'
                    )}
                  />
                  <span>v{ver.versionNumber}</span>
                  {isLatest && (
                    <span className="text-[9px] px-1 py-0.2 rounded font-black uppercase tracking-wider bg-white/20 text-white">
                      LATEST
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Status Tag */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400 font-medium">Approval:</span>
          <span
            className={cn(
              'px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5',
              statusPill.bg
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', statusPill.dot)} />
            <span>{statusPill.label}</span>
          </span>
        </div>
      </div>

      {/* ── 3. Main Architectural Workspace Canvas (Clean Light Theme) ── */}
      <div className="flex-1 flex relative overflow-hidden bg-slate-100">
        {/* Main Canvas Area */}
        <div
          ref={viewport2DRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={cn(
            'flex-1 relative flex items-center justify-center overflow-hidden bg-slate-100',
            isAnnotationMode
              ? 'cursor-crosshair'
              : isDragging
              ? 'cursor-grabbing'
              : isImageFormat
              ? 'cursor-grab'
              : 'cursor-default'
          )}
        >
          {/* Subtle Floating Pin Placement Hint Pill (Light Theme) */}
          {isAnnotationMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-4 py-2 bg-white/95 text-slate-800 rounded-full shadow-lg border border-slate-200 text-xs font-semibold backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Click on drawing to place pin</span>
              <button
                onClick={() => setIsAnnotationMode(false)}
                className="ml-1 text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Canvas Rendering (2D Blueprint / PDF / 3D Model) */}
          {isDirect3DFormat ? (
            <div className="w-full h-full relative">
              <div ref={mountRef} className="w-full h-full" />
              {loading3D && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs z-30">
                  <Loader2 className="w-9 h-9 animate-spin text-purple-600 mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    Loading 3D Model... {loading3DProgress}%
                  </p>
                </div>
              )}
              {load3DError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-30">
                  <Box className="w-12 h-12 text-slate-400 mb-2" />
                  <p className="text-sm font-bold text-slate-800">{load3DError}</p>
                </div>
              )}
            </div>
          ) : isImageFormat && activeUrl ? (
            <div
              style={{
                transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.12s ease-out',
              }}
              className="w-full h-full flex items-center justify-center p-4 pointer-events-auto"
            >
              {/* Image & Scale-Invariant Coordinate Pin Wrapper */}
              <div className="relative inline-block select-none max-w-full max-h-[82vh]">
                <img
                  ref={imageRef}
                  src={activeUrl}
                  alt={activeTitle}
                  onClick={handleImageClick}
                  className={cn(
                    'max-w-full max-h-[82vh] object-contain border border-slate-300/80 bg-white block shadow-sm transition-all',
                    isAnnotationMode && 'cursor-crosshair'
                  )}
                  draggable={false}
                />

                {/* ── SCALE-INVARIANT PRECISION ARCHITECTURAL PINS (LIGHT THEME) ── */}
                {currentVersionAnnotations.map((anno, index) => {
                  const theme = getAnnoTheme(anno.type);
                  const isSelected = selectedAnnotation?.id === anno.id;
                  const isHovered = hoveredAnnotationId === anno.id;
                  const hasImage = anno.attachments?.some((a) => a.type === 'image');
                  const hasVideo = anno.attachments?.some((a) => a.type === 'video');
                  const hasAudio = anno.attachments?.some((a) => a.type === 'audio');

                  // Counter-scale so pin stays crisp and consistently sized at any zoom/rotation
                  const invScale = 1 / Math.max(0.1, zoomLevel);
                  const invRot = -rotation;

                  return (
                    <div
                      key={anno.id}
                      style={{
                        top: `${anno.y}%`,
                        left: `${anno.x}%`,
                        transform: `translate(-50%, -100%) scale(${invScale}) rotate(${invRot}deg)`,
                        transformOrigin: '50% 100%',
                      }}
                      onMouseEnter={() => setHoveredAnnotationId(anno.id)}
                      onMouseLeave={() => setHoveredAnnotationId(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAnnotation(anno);
                      }}
                      className={cn(
                        'absolute cursor-pointer z-30 group select-none pointer-events-auto transition-transform',
                        (isSelected || isHovered) && 'z-40'
                      )}
                    >
                      {/* Precise Focal Point Beacon Ring */}
                      <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 pointer-events-none flex items-center justify-center">
                        <span className={cn('w-2 h-2 rounded-full ring-2 ring-white shadow-xs', theme.beacon)} />
                      </div>

                      {/* Professional Teardrop Needle Marker Pin */}
                      <div className="relative flex flex-col items-center filter drop-shadow-md transition-transform active:scale-90">
                        <div
                          className={cn(
                            'relative px-2 py-1 rounded-xl flex items-center gap-1.5 font-bold text-[11px] shadow-lg transition-all border border-white/40',
                            anno.resolved
                              ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white'
                              : `bg-gradient-to-br ${theme.gradient} text-white`,
                            isSelected && 'ring-3 ring-blue-600 shadow-xl scale-110'
                          )}
                        >
                          {anno.resolved ? (
                            <Check size={12} className="stroke-[3]" />
                          ) : (
                            <span className="font-mono text-[11px] tracking-tight">{anno.pinNumber || index + 1}</span>
                          )}

                          {/* Media Icons Chip */}
                          {(hasImage || hasVideo || hasAudio) && (
                            <div className="flex items-center gap-0.5 pl-0.5 border-l border-white/30 text-white/90">
                              {hasImage && <Camera size={10} />}
                              {hasVideo && <Film size={10} />}
                              {hasAudio && <Volume2 size={10} />}
                            </div>
                          )}
                        </div>

                        {/* Needle Downward Tip */}
                        <div
                          className="w-0 h-0 border-x-4 border-x-transparent border-t-6 -mt-0.5"
                          style={{
                            borderTopColor: anno.resolved ? '#0f766e' : theme.tipColor,
                          }}
                        />
                      </div>

                      {/* Professional Hover Tooltip HUD Card (Light Theme) */}
                      <AnimatePresence>
                        {isHovered && !selectedAnnotation && (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.95 }}
                            transition={{ duration: 0.12 }}
                            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 bg-white/95 text-slate-900 p-3 rounded-2xl shadow-xl z-50 min-w-[210px] max-w-[280px] pointer-events-none backdrop-blur-xl border border-slate-200/90 font-sans"
                          >
                            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                              <span className="font-bold text-[10px] uppercase tracking-wider text-blue-600">
                                Marker #{anno.pinNumber || index + 1} • {theme.label}
                              </span>
                              <span
                                className={cn(
                                  'text-[9px] font-medium px-1.5 py-0.5 rounded-full border',
                                  anno.type === 'comment'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : anno.resolved
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                )}
                              >
                                {anno.type === 'comment' ? 'Note' : anno.resolved ? 'Resolved' : 'Open Snag'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-700 font-medium line-clamp-2 mt-1.5 leading-relaxed">
                              {anno.text || '(Attachment inspection only)'}
                            </p>

                            {/* Thumbnail strip in hover card */}
                            {anno.attachments && anno.attachments.length > 0 && (
                              <div className="flex items-center gap-1.5 pt-2 mt-1.5 border-t border-slate-100">
                                {anno.attachments.slice(0, 3).map((att, aIdx) => (
                                  <div
                                    key={aIdx}
                                    className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center"
                                  >
                                    {att.type === 'video' ? (
                                      <div className="w-full h-full flex items-center justify-center bg-amber-50 text-amber-700">
                                        <Play size={10} className="fill-amber-600" />
                                      </div>
                                    ) : att.type === 'audio' ? (
                                      <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-600">
                                        <Volume2 size={12} />
                                      </div>
                                    ) : (
                                      <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                    )}
                                  </div>
                                ))}
                                <span className="text-[10px] text-slate-500 pl-1 font-medium">
                                  {anno.attachments.length} attachment(s)
                                </span>
                              </div>
                            )}

                            <div className="text-[9px] text-slate-400 pt-1.5 flex items-center justify-between border-t border-slate-100/60 mt-1">
                              <span>Click to inspect details</span>
                              <span>X: {anno.x}% Y: {anno.y}%</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : fileType === 'pdf' && activeUrl ? (
            <div className="w-full h-full p-4">
              <iframe
                src={`${activeUrl}#toolbar=0`}
                className="w-full h-full border border-slate-200 bg-white rounded-xl shadow-md"
                title="PDF Blueprint Viewer"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-3xl shadow-md text-center max-w-sm">
              <FileText className="w-12 h-12 text-slate-400 mb-3" />
              <h4 className="text-sm font-bold text-slate-800">{activeTitle}</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                This blueprint format is best viewed by downloading or opening externally.
              </p>
              {activeUrl && (
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Download Asset
                </a>
              )}
            </div>
          )}

          {/* ── Bottom Floating Architectural Studio Dock (Light Theme) ── */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl font-sans">
            {/* Pan Drag Mode */}
            <button
              onClick={() => setIsAnnotationMode(false)}
              className={cn(
                'p-2 rounded-xl transition-all cursor-pointer',
                !isAnnotationMode ? 'bg-slate-100 text-blue-600 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
              title="Pan Mode (Drag to navigate)"
            >
              <Hand size={16} />
            </button>

            {/* Drop Marker Tool */}
            {isImageFormat && (
              <button
                onClick={() => setIsAnnotationMode(!isAnnotationMode)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                  isAnnotationMode
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-200 ring-2 ring-rose-400/40'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                )}
                title="Drop Marker Pin"
              >
                <Pin size={14} className={isAnnotationMode ? 'fill-white' : ''} />
                <span>Marker</span>
              </button>
            )}

            <div className="h-5 w-px bg-slate-200 mx-1" />

            {/* Zoom Controls */}
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.1, Number((z - 0.25).toFixed(2))))}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>

            <button
              onClick={resetViewport}
              className="px-2.5 py-1 text-xs font-mono font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Reset View 100%"
            >
              {Math.round(zoomLevel * 100)}%
            </button>

            <button
              onClick={() => setZoomLevel((z) => Math.min(10, Number((z + 0.25).toFixed(2))))}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>

            <div className="h-5 w-px bg-slate-200 mx-1" />

            {/* Rotation Controls */}
            <button
              onClick={() => setRotation((r) => (r - 90) % 360)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              title="Rotate Counter-Clockwise"
            >
              <RotateCcw size={16} />
            </button>

            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              title="Rotate Clockwise"
            >
              <RotateCw size={16} />
            </button>

            <div className="h-5 w-px bg-slate-200 mx-1" />

            {/* Drawer Toggles */}
            <button
              onClick={() => {
                setShowSidePanel(!showSidePanel);
                setActiveTab('annotations');
              }}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                showSidePanel && activeTab === 'annotations'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'hover:bg-slate-100 text-slate-700'
              )}
            >
              <MessageSquare size={14} />
              <span>Pins ({currentVersionAnnotations.length})</span>
            </button>
          </div>
        </div>

        {/* ── 4. Slide-over Inspection & Revisions Side Panel (Light Theme) ── */}
        <AnimatePresence>
          {showSidePanel && (
            <motion.div
              initial={{ x: 380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 380, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="w-80 sm:w-96 border-l border-slate-200 bg-white h-full z-40 flex flex-col shadow-2xl shrink-0 text-slate-800 font-sans"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                    {activeTab === 'annotations' ? <Pin size={16} /> : <History size={16} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {activeTab === 'annotations'
                        ? 'Inspection Pins'
                        : activeTab === 'details'
                        ? 'Drawing Specifications'
                        : 'Revisions & Audit Log'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {activeTab === 'annotations'
                        ? `${currentVersionAnnotations.length} registered markers on v${activeVersionNum}`
                        : `${allVersions.length} revisions tracked`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSidePanel(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Tabs */}
              <div className="flex border-b border-slate-200 px-4 pt-2 bg-slate-50/30 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setActiveTab('annotations')}
                  className={cn(
                    'pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer',
                    activeTab === 'annotations'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  )}
                >
                  <Pin size={13} />
                  <span>Pins ({currentVersionAnnotations.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('details')}
                  className={cn(
                    'pb-2.5 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer',
                    activeTab === 'details'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  )}
                >
                  Specs
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    'pb-2.5 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer',
                    activeTab === 'history'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  )}
                >
                  Revisions ({allVersions.length})
                </button>
              </div>

              {/* Drawer Body Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeTab === 'annotations' ? (
                  <div className="space-y-3">
                    {/* Header Controls & Filter */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1 text-[11px]">
                        {['all', 'open', 'resolved', 'media'].map((f) => (
                          <button
                            key={f}
                            onClick={() => setFilterType(f)}
                            className={cn(
                              'px-2 py-0.5 rounded-md font-bold capitalize transition-colors cursor-pointer',
                              filterType === f
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            )}
                          >
                            {f}
                          </button>
                        ))}
                      </div>

                      {isImageFormat && (
                        <button
                          onClick={() => {
                            setIsAnnotationMode(true);
                            toast.info('Click anywhere on the blueprint to place marker.');
                          }}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Pin size={12} /> Drop Pin
                        </button>
                      )}
                    </div>

                    {currentVersionAnnotations.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                        <Pin className="w-8 h-8 text-slate-300 mx-auto" />
                        <h4 className="text-xs font-bold text-slate-700">No Markers Found</h4>
                        <p className="text-[11px] text-slate-500">
                          Use the Marker tool in the bottom dock to flag defects, place notes, and attach inspection media.
                        </p>
                      </div>
                    ) : (
                      currentVersionAnnotations.map((anno, idx) => {
                        const theme = getAnnoTheme(anno.type);
                        const isSelected = selectedAnnotation?.id === anno.id;

                        return (
                          <div
                            key={anno.id}
                            onClick={() => setSelectedAnnotation(anno)}
                            className={cn(
                              'p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2.5',
                              isSelected
                                ? 'bg-blue-50/60 border-blue-500 ring-1 ring-blue-500/50 shadow-xs'
                                : 'bg-white border-slate-200/90 hover:bg-slate-50'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    'w-6 h-6 rounded-xl flex items-center justify-center text-[10px] font-bold shadow-xs',
                                    anno.resolved ? 'bg-emerald-600 text-white' : `${theme.bg} text-white`
                                  )}
                                >
                                  {anno.resolved ? <Check size={12} /> : anno.pinNumber || idx + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-900">{theme.label}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {anno.createdAt ? new Date(anno.createdAt).toLocaleDateString() : 'Recent'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-700 font-medium leading-relaxed">
                              {anno.text || '(Attachment only)'}
                            </p>

                            {/* Attached Media Previews */}
                            {anno.attachments && anno.attachments.length > 0 && (
                              <div className="flex items-center gap-2 pt-1 flex-wrap">
                                {anno.attachments.map((att, aIdx) => (
                                  <div
                                    key={aIdx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (att.type === 'audio') {
                                        setSelectedAnnotation(anno);
                                      } else {
                                        setMediaPreviewUrl(att.url);
                                        setMediaPreviewType(att.type === 'video' ? 'video' : 'image');
                                      }
                                    }}
                                    className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 group/media cursor-pointer flex items-center justify-center"
                                  >
                                    {att.type === 'video' ? (
                                      <div className="w-full h-full flex flex-col items-center justify-center bg-amber-50 text-amber-700">
                                        <Play size={14} className="fill-amber-600" />
                                      </div>
                                    ) : att.type === 'audio' ? (
                                      <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-50 text-indigo-600 group-hover/media:bg-indigo-100 transition-colors">
                                        <Volume2 size={16} />
                                        <span className="text-[9px] font-bold mt-0.5">Audio</span>
                                      </div>
                                    ) : (
                                      <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                    )}
                                    {att.type !== 'audio' && (
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/media:opacity-100 flex items-center justify-center text-white transition-opacity">
                                        <Eye size={12} />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1 text-[10px] border-t border-slate-100 text-slate-500">
                              <span
                                className={cn(
                                  'font-medium',
                                  anno.type === 'comment'
                                    ? 'text-blue-600'
                                    : anno.resolved
                                    ? 'text-emerald-600'
                                    : 'text-rose-600'
                                )}
                              >
                                {anno.type === 'comment'
                                  ? '• Note'
                                  : anno.resolved
                                  ? '✓ Resolved Snag'
                                  : '• Open Snag'}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEditAnnotation(anno);
                                  }}
                                  className="text-slate-400 hover:text-blue-600 transition-colors p-1 cursor-pointer"
                                  title="Edit Pin"
                                >
                                  <Pencil size={12} />
                                </button>
                                {anno.type === 'issue' && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleResolve(anno.id);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
                                  >
                                    {anno.resolved ? 'Reopen' : 'Resolve'}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAnnotation(anno.id);
                                  }}
                                  className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                  title="Delete Pin"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : activeTab === 'details' ? (
                  <div className="space-y-4">
                    {/* Drawing Metadata Card */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Blueprint Title
                        </span>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{activeTitle}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Discipline</span>
                          <p className="font-semibold text-slate-700 mt-0.5">
                            {drawing?.discipline || 'Architectural'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Category</span>
                          <p className="font-semibold text-slate-700 mt-0.5">
                            {drawing?.drawingType || '2D Drawing'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Active Revision</span>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5">
                          {activeVersion?.revision || `Rev ${activeVersionNum - 1}`} •{' '}
                          {activeVersion?.changes || 'Initial Blueprint release'}
                        </p>
                      </div>
                    </div>

                    {/* Quick Approval Actions */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700">Approval Workflow</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleStatusChange('approved')}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 size={14} /> Approve
                        </button>
                        <button
                          onClick={() => handleStatusChange('rejected')}
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <XCircle size={14} /> Request Change
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={() => setIsRevisionModalOpen(true)}
                        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <UploadCloud size={15} /> Upload Next Revision
                      </button>

                      {activeUrl && (
                        <a
                          href={activeUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Download size={14} /> Download Original File
                        </a>
                      )}

                      <button
                        onClick={handleCopyLink}
                        className="w-full px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Copy size={13} /> {copiedLink ? 'Link Copied!' : 'Copy Viewport Link'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Revisions Log Tab */
                  <div className="space-y-3">
                    {allVersions.map((ver) => {
                      const isSelected = ver.versionNumber === selectedVersionNum;

                      return (
                        <div
                          key={ver.versionNumber}
                          onClick={() => setSelectedVersionNum(ver.versionNumber)}
                          className={cn(
                            'p-3 rounded-xl border transition-all cursor-pointer space-y-1.5',
                            isSelected
                              ? 'bg-blue-50/60 border-blue-400 shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <span
                                className={cn(
                                  'w-2 h-2 rounded-full',
                                  ver.status === 'approved' ? 'bg-emerald-500' : 'bg-blue-500'
                                )}
                              />
                              v{ver.versionNumber} ({ver.revision})
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {ver.uploadedAt ? new Date(ver.uploadedAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{ver.changes}</p>
                          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                            <span>Uploaded by {ver.uploadedBy}</span>
                            {isSelected && <span className="text-blue-600 font-bold">Active View</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 5. Modal: Create Architectural Inspection Pin (Clean Standard Enterprise SaaS) ── */}
      <AnimatePresence>
        {isCreateAnnoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-lg border border-slate-200 bg-white rounded-2xl shadow-2xl overflow-hidden text-slate-800"
            >
              {/* Clean Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {editingAnnoId ? 'Edit Inspection Pin' : 'Add Inspection Pin'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Position: {pendingCoords.x}%, {pendingCoords.y}% • {activeTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    cancelAudioRecording();
                    setIsCreateAnnoModalOpen(false);
                    setEditingAnnoId(null);
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveAnnotation} className="p-5 space-y-4">
                {/* Segmented Control for Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Type</label>
                  <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setAnnoType('comment')}
                      className={cn(
                        'py-1.5 text-xs font-medium rounded-md transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer',
                        annoType === 'comment'
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full', annoType === 'comment' ? 'bg-blue-500' : 'bg-slate-300')} />
                      <span>Note</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAnnoType('issue')}
                      className={cn(
                        'py-1.5 text-xs font-medium rounded-md transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer',
                        annoType === 'issue'
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full', annoType === 'issue' ? 'bg-rose-500' : 'bg-slate-300')} />
                      <span>Snag / Defect</span>
                    </button>
                  </div>
                </div>

                {/* Observation Note */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Observation Note <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe the defect, required touch-up, or architectural note..."
                    value={annoText}
                    onChange={(e) => setAnnoText(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 resize-none font-normal leading-relaxed"
                  />
                </div>

                {/* ── Audio Voice Note Recorder & Player Widget ── */}
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Mic size={13} className="text-rose-600" />
                      <span>Voice Memo / Audio Note</span>
                    </label>
                    {recordedAudioUrl && !isRecordingAudio && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Check size={10} className="stroke-[3]" /> Recorded
                      </span>
                    )}
                  </div>

                  {/* Hidden audio element for playback */}
                  {recordedAudioUrl && (
                    <audio
                      ref={recordedAudioRef}
                      src={recordedAudioUrl}
                      onTimeUpdate={handleAudioTimeUpdate}
                      onLoadedMetadata={handleAudioLoadedMetadata}
                      onEnded={handleAudioEnded}
                      className="hidden"
                    />
                  )}

                  {/* Recording & Player Card (Clean Light Theme) */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/75 space-y-2.5">
                    {/* State 1: Active Live Recording */}
                    {isRecordingAudio ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                          </span>
                          <span className="text-xs font-semibold text-rose-700 tracking-wide">
                            Recording... {formatAudioTime(recordingDuration)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={stopAudioRecording}
                            className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Square size={11} className="fill-white" /> Done
                          </button>
                          <button
                            type="button"
                            onClick={cancelAudioRecording}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
                            title="Cancel recording"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : recordedAudioUrl ? (
                      /* State 2: Recorded Audio Player with Scrubber */
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={togglePlayRecordedAudio}
                              className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                            >
                              {isPlayingAudio ? (
                                <Pause size={12} className="fill-white" />
                              ) : (
                                <Play size={12} className="fill-white ml-0.5" />
                              )}
                            </button>
                            <div className="text-[11px] font-medium text-slate-700 font-mono">
                              {formatAudioTime(audioPlaybackTime)} / {formatAudioTime(audioDuration || recordingDuration || 1)}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={handleReRecordAudio}
                              className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-blue-600 hover:bg-white rounded-md border border-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                              title="Record again"
                            >
                              <RotateCcw size={11} /> Re-record
                            </button>
                            <button
                              type="button"
                              onClick={handleDeleteRecordedAudio}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Delete voice note"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Interactive Scrubber Bar */}
                        <div
                          onClick={handleAudioSeek}
                          className="h-2 w-full bg-slate-200 rounded-full cursor-pointer relative overflow-hidden group"
                        >
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-75"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  (audioPlaybackTime / (audioDuration || recordingDuration || 1)) * 100
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      /* State 3: Ready to Record */
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-slate-500">
                          Click record to speak your inspection observations
                        </p>
                        <button
                          type="button"
                          onClick={startAudioRecording}
                          className="px-3 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Mic size={13} className="text-rose-600" />
                          <span>Record Audio</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Attachments Section (Photos and Videos only - Upload Audio File removed) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Paperclip size={13} className="text-slate-500" />
                      <span>Photo & Video Attachments</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {annoAttachments.length} attached
                    </span>
                  </div>

                  {/* Upload Toolbar: Only Photos and Videos */}
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-lg text-xs font-medium text-slate-700 hover:text-blue-700 cursor-pointer transition-colors">
                      <ImageIcon size={14} className="text-blue-600" />
                      <span>Add Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageAttachmentUpload}
                        disabled={isUploadingImage}
                      />
                    </label>

                    <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-slate-300 hover:border-purple-500 hover:bg-purple-50/50 rounded-lg text-xs font-medium text-slate-700 hover:text-purple-700 cursor-pointer transition-colors">
                      <Video size={14} className="text-purple-600" />
                      <span>Add Video</span>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleVideoAttachmentUpload}
                        disabled={isUploadingVideo}
                      />
                    </label>
                  </div>

                  {(isUploadingImage || isUploadingVideo) && (
                    <div className="flex items-center gap-2 py-1 text-xs text-blue-600">
                      <Loader2 size={13} className="animate-spin" />
                      <span>Uploading media to cloud...</span>
                    </div>
                  )}

                  {/* Existing Attachments List */}
                  {annoAttachments.length > 0 && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {annoAttachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50/60 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {att.type === 'image' ? (
                              <ImageIcon size={14} className="text-blue-600 shrink-0" />
                            ) : att.type === 'video' ? (
                              <Video size={14} className="text-purple-600 shrink-0" />
                            ) : (
                              <Volume2 size={14} className="text-rose-600 shrink-0" />
                            )}
                            <span className="truncate font-medium text-slate-700">{att.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={() => {
                                setMediaPreviewUrl(att.url);
                                setMediaPreviewType(att.type);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Preview"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setAnnoAttachments((prev) => prev.filter((_, i) => i !== idx))}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Remove"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      cancelAudioRecording();
                      setIsCreateAnnoModalOpen(false);
                      setEditingAnnoId(null);
                    }}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAnno || isUploadingImage || isUploadingVideo}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingAnno ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Check size={13} /> {editingAnnoId ? 'Update Pin' : 'Save Pin'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 6. Modal: Detailed Inspection Pin Viewer (Senior UX / Apple-Grade Light Theme) ── */}
      <AnimatePresence>
        {selectedAnnotation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full max-w-lg border border-slate-200 bg-white rounded-2xl shadow-2xl overflow-hidden text-slate-800 flex flex-col max-h-[88vh]"
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs shrink-0',
                      selectedAnnotation.type === 'comment'
                        ? 'bg-blue-600 text-white shadow-blue-500/20'
                        : selectedAnnotation.resolved
                        ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                        : 'bg-rose-600 text-white shadow-rose-500/20'
                    )}
                  >
                    #{selectedAnnotation.pinNumber || 1}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        Pin #{selectedAnnotation.pinNumber || 1}
                      </h3>
                      {selectedAnnotation.type === 'comment' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                          Note
                        </span>
                      ) : selectedAnnotation.resolved ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          <CheckCircle2 size={11} className="stroke-[2.5]" /> Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Open Snag
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400" />
                        {Number(selectedAnnotation.x).toFixed(1)}%, {Number(selectedAnnotation.y).toFixed(1)}%
                      </span>
                      <span>•</span>
                      <span className="font-medium text-slate-600">v{selectedAnnotation.versionNumber || activeVersionNum}</span>
                      {selectedAnnotation.createdAt && (
                        <>
                          <span>•</span>
                          <span>{new Date(selectedAnnotation.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAnnotation(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* 1. Observation Note Section */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <FileText size={13} className="text-slate-400" />
                      <span>Observation Note</span>
                    </label>
                    {selectedAnnotation.author?.name && (
                      <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                        <User size={11} className="text-slate-400" />
                        {selectedAnnotation.author.name}
                      </span>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-normal">
                    {selectedAnnotation.text ? (
                      selectedAnnotation.text
                    ) : (
                      <span className="text-slate-400 italic text-xs">No text observation provided.</span>
                    )}
                  </div>
                </div>

                {/* 2. Audio Voice Note (if present) */}
                {selectedAnnotation.attachments?.some((a) => a.type === 'audio') && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Mic size={13} className="text-rose-500" />
                      <span>Voice Memo / Audio Note</span>
                    </label>

                    {selectedAnnotation.attachments
                      .filter((a) => a.type === 'audio')
                      .map((aud, aIdx) => (
                        <div
                          key={aIdx}
                          className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/40 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                              <Volume2 size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-800 truncate">{aud.name || 'Voice Note'}</p>
                              <audio
                                src={aud.url}
                                controls
                                className="w-full h-7 mt-1.5 rounded"
                              />
                            </div>
                          </div>
                          <a
                            href={aud.url}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 transition-colors shrink-0"
                            title="Download Voice Note"
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      ))}
                  </div>
                )}

                {/* 3. Photo & Video Attachments (if present) */}
                {selectedAnnotation.attachments?.some((a) => a.type !== 'audio') && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Paperclip size={13} className="text-slate-400" />
                        <span>
                          Media Attachments (
                          {selectedAnnotation.attachments.filter((a) => a.type !== 'audio').length}
                          )
                        </span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedAnnotation.attachments
                        .filter((a) => a.type !== 'audio')
                        .map((att, idx) => (
                          <div
                            key={idx}
                            className="group rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 hover:shadow-md transition-all flex flex-col"
                          >
                            {/* Visual Thumbnail */}
                            {att.type === 'image' ? (
                              <div
                                onClick={() => {
                                  setMediaPreviewUrl(att.url);
                                  setMediaPreviewType('image');
                                }}
                                className="relative h-36 w-full bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center"
                              >
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold backdrop-blur-[1px]">
                                  <Maximize2 size={14} /> View Photo
                                </div>
                              </div>
                            ) : att.type === 'video' ? (
                              <div className="relative h-36 w-full bg-slate-950 flex items-center justify-center">
                                <video
                                  src={att.url}
                                  controls
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="h-28 w-full bg-slate-50 flex items-center justify-center">
                                <FileText size={24} className="text-slate-400" />
                              </div>
                            )}

                            {/* Info bar below thumbnail */}
                            <div className="p-2.5 flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50">
                              <span className="text-xs font-medium text-slate-700 truncate" title={att.name}>
                                {att.name}
                              </span>
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition-colors shrink-0"
                                title="Download file"
                              >
                                <Download size={13} />
                              </a>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/60">
                <button
                  type="button"
                  onClick={() => handleDeleteAnnotation(selectedAnnotation.id)}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Delete Pin</span>
                </button>

                <div className="flex items-center gap-2">
                  {selectedAnnotation.type === 'issue' && (
                    <button
                      type="button"
                      onClick={() => handleToggleResolve(selectedAnnotation.id)}
                      className={cn(
                        'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs',
                        selectedAnnotation.resolved
                          ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      )}
                    >
                      <CheckCircle2 size={13} />
                      <span>{selectedAnnotation.resolved ? 'Reopen Snag' : 'Mark as Resolved'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleStartEditAnnotation(selectedAnnotation)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pencil size={13} />
                    <span>Edit Pin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAnnotation(null)}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 7. Modal: Full-screen Media Lightbox ── */}
      <AnimatePresence>
        {mediaPreviewUrl && (
          <div
            onClick={() => setMediaPreviewUrl(null)}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl max-h-[90vh] bg-black rounded-3xl overflow-hidden shadow-2xl p-2 cursor-default flex items-center justify-center"
            >
              <button
                onClick={() => setMediaPreviewUrl(null)}
                className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-full z-20 cursor-pointer"
              >
                <X size={18} />
              </button>
              {mediaPreviewType === 'video' ? (
                <video src={mediaPreviewUrl} controls autoPlay className="max-w-full max-h-[82vh] rounded-2xl" />
              ) : (
                <img src={mediaPreviewUrl} alt="Evidence preview" className="max-w-full max-h-[82vh] object-contain rounded-2xl" />
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 8. Modal: Upload Revision ── */}
      <AnimatePresence>
        {isRevisionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-slate-200 bg-white rounded-3xl overflow-hidden shadow-2xl text-slate-800"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <GitBranch size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Upload Rev {allVersions.length}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate max-w-xs">{activeTitle}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRevisionModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleUploadRevision} className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Describe Changes in this Revision *</label>
                  <input
                    required
                    placeholder="e.g. Revised partition dimensions and rectified masonry lintel elevation"
                    value={revChanges}
                    onChange={(e) => setRevChanges(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block mb-1">New Revision Blueprint File *</label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-blue-500/50 bg-slate-50 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 transition-all relative cursor-pointer">
                    <input
                      type="file"
                      required
                      accept="image/*,application/pdf,.pdf,.dwg,.dxf,.skp,.obj,.fbx,.3ds,.blend,.rvt,.zip,.rar"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) setSelectedRevFile(e.target.files[0]);
                      }}
                    />
                    <FileDown className="w-8 h-8 text-blue-500" />
                    <span className="text-xs font-bold text-center text-slate-700 px-2 truncate w-full">
                      {selectedRevFile ? selectedRevFile.name : 'Click or drag new revision blueprint'}
                    </span>
                    <span className="text-[10px] text-slate-400">PDF, DWG, SKP, OBJ, or High-Res Image</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRevisionModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRev}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingRev && <Loader2 className="w-4 h-4 animate-spin" />}
                    Upload Revision
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
