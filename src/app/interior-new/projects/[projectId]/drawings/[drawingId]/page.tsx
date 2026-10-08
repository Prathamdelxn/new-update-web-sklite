'use client';

// =============================================================================
// Sky-Lite Web — Project Architectural Drawing Studio Viewport
// Enterprise Viewport for 2D Working Drawings, CAD Plans & 3D Interactive Models
// Matches the dedicated Drawing Studio Viewport from CRM Lead Details:
// - Breadcrumb header with direct project navigation & Version/Audit drawer toggle
// - Dotted grid architectural canvas with Figma/Miro-style focal zoom & pan controls
// - Interactive Three.js WebGL 3D Model Renderer (GLTF, GLB, OBJ, FBX)
// - Floating bottom controls dock (Zoom, Rotate, Reset, Audit)
// - On-demand Version & Audit History side drawer with Upload Revision workflow
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  // 2D Viewport Pan & Zoom State
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // 2D Pan Dragging State
  const [isDragging, setIsDragging] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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
        setSelectedVersionNum(highestVer);
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

  // Wheel Zoom toward cursor focal point with non-passive preventDefault (prevents webpage zoom)
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

  const handleStatusChange = async (newStatus: string) => {
    if (!drawing?._id) return;
    try {
      const res = await interiorProjectService.updateDrawing(projectId, {
        drawingId: drawing._id,
        status: newStatus,
      });
      if (res.success) {
        toast.success(`Status updated to: ${newStatus.replace('_', ' ').toUpperCase()}`);
        setDrawing((prev: any) => ({ ...prev, status: newStatus }));
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

      const res = await interiorProjectService.updateDrawing(projectId, {
        drawingId: drawing._id,
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
      toast.success('Drawing link copied');
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs font-bold text-slate-500">Loading Architectural Drawing Studio...</p>
      </div>
    );
  }

  if (!drawing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center max-w-md mx-auto space-y-4">
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
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden bg-white select-none font-sans">
      {/* ── 1. Top Breadcrumb Bar ── */}
      <header className="h-14 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/interior-new/projects/${projectId}/drawings`}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95 border border-slate-200/70 shrink-0"
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

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowSidePanel(!showSidePanel)}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border shadow-2xs',
              showSidePanel
                ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            )}
          >
            <History size={14} />
            <span>Version & Audit ({allVersions.length})</span>
          </button>
        </div>
      </header>

      {/* ── 2. Sub-Header: Versions Bar & Status Badge ── */}
      <div className="h-11 border-b border-slate-200/70 bg-slate-50/70 px-4 sm:px-6 flex items-center justify-between z-20 shrink-0 overflow-x-auto scrollbar-none">
        {/* Left: Versions Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mr-1">
            <History size={13} className="text-slate-400" /> Versions:
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
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border',
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
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
          <span className="text-xs font-bold text-slate-400">Status:</span>
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

      {/* ── 3. Main Workspace Canvas & Side Panel ── */}
      <div className="flex-1 flex relative overflow-hidden bg-slate-100">
        {/* Main Canvas Area */}
        <div
          ref={viewport2DRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={cn(
            'flex-1 relative flex items-center justify-center overflow-hidden',
            isDragging ? 'cursor-grabbing' : isImageFormat ? 'cursor-grab' : 'cursor-default'
          )}
          style={{
            backgroundColor: '#f8fafc',
            backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
          }}
        >
          {/* Floating Left Top Info Pill */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              v{activeVersionNum}
            </span>
          </div>

          {/* Canvas Rendering (2D Image / PDF / 3D Model) */}
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
              className="w-full h-full flex items-center justify-center pointer-events-none p-4"
            >
              <img
                src={activeUrl}
                alt={activeTitle}
                className="max-w-full max-h-[82vh] object-contain border border-slate-300/80 bg-white"
                draggable={false}
              />
            </div>
          ) : fileType === 'pdf' && activeUrl ? (
            <div className="w-full h-full p-4">
              <iframe
                src={`${activeUrl}#toolbar=0`}
                className="w-full h-full border border-slate-300/80 bg-white"
                title="PDF Drawing Viewer"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center max-w-sm">
              <FileText className="w-12 h-12 text-slate-400 mb-3" />
              <h4 className="text-sm font-bold text-slate-800">{activeTitle}</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                This format is best previewed by downloading or viewing externally.
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

          {/* ── Bottom Floating Controls Dock ── */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.1, Number((z - 0.25).toFixed(2))))}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>

            <button
              onClick={resetViewport}
              className="px-2.5 py-1 text-xs font-mono font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Reset View 100%"
            >
              {Math.round(zoomLevel * 100)}%
            </button>

            <button
              onClick={() => setZoomLevel((z) => Math.min(10, Number((z + 0.25).toFixed(2))))}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>

            <div className="h-5 w-px bg-slate-200 mx-1" />

            <button
              onClick={() => setRotation((r) => (r - 90) % 360)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors"
              title="Rotate Counter-Clockwise"
            >
              <RotateCcw size={16} />
            </button>

            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors"
              title="Rotate Clockwise"
            >
              <RotateCw size={16} />
            </button>

            <div className="h-5 w-px bg-slate-200 mx-1" />

            <button
              onClick={() => setShowSidePanel(!showSidePanel)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                showSidePanel ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'
              )}
            >
              <History size={14} />
              <span>Audit ({allVersions.length})</span>
            </button>
          </div>
        </div>

        {/* ── 4. Slide-over Version & Audit History Side Panel ── */}
        <AnimatePresence>
          {showSidePanel && (
            <motion.div
              initial={{ x: 380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 380, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="w-80 sm:w-96 border-l border-slate-200 bg-white h-full z-30 flex flex-col shadow-2xl shrink-0"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <History size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Version & Audit History</h3>
                    <p className="text-[11px] text-slate-500">{allVersions.length} registered revisions</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSidePanel(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Tabs */}
              <div className="flex border-b border-slate-200 px-4 pt-2 bg-slate-50/30">
                <button
                  onClick={() => setActiveTab('details')}
                  className={cn(
                    'pb-2.5 px-3 text-xs font-bold border-b-2 transition-all',
                    activeTab === 'details'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  )}
                >
                  Active Details
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    'pb-2.5 px-3 text-xs font-bold border-b-2 transition-all',
                    activeTab === 'history'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  )}
                >
                  Revisions Log ({allVersions.length})
                </button>
              </div>

              {/* Drawer Body Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeTab === 'details' ? (
                  <div className="space-y-4">
                    {/* Drawing Metadata Card */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Drawing Title
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
                          {activeVersion?.changes || 'No changes noted'}
                        </p>
                      </div>
                    </div>

                    {/* Quick Approval Actions */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700">Approval Workflow</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleStatusChange('approved')}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 size={14} /> Approve
                        </button>
                        <button
                          onClick={() => handleStatusChange('rejected')}
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <XCircle size={14} /> Request Change
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={() => setIsRevisionModalOpen(true)}
                        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                      >
                        <UploadCloud size={15} /> Upload Next Revision
                      </button>

                      {activeUrl && (
                        <a
                          href={activeUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                        >
                          <Download size={14} /> Download Original File
                        </a>
                      )}

                      <button
                        onClick={handleCopyLink}
                        className="w-full px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
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
                            <span className="text-[10px] text-slate-400">
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

      {/* ── 5. Modal: Upload Revision ── */}
      <AnimatePresence>
        {isRevisionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-slate-200 rounded-3xl bg-white overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <GitBranch size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Upload Rev {allVersions.length}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate max-w-xs">{activeTitle}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRevisionModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleUploadRevision} className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Describe Revision Changes *</label>
                  <input
                    required
                    placeholder="e.g. Adjusted partition walls and revised false ceiling elevation"
                    value={revChanges}
                    onChange={(e) => setRevChanges(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block mb-1">New Revision File *</label>
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
                      {selectedRevFile ? selectedRevFile.name : 'Click or drag new revision file'}
                    </span>
                    <span className="text-[10px] text-slate-400">PDF, DWG, SKP, OBJ or Image files</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRevisionModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRev}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
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
