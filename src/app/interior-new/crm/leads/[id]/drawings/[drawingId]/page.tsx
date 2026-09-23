'use client';

// =============================================================================
// Sky-Lite Web — Architectural Drawing Studio
// Enterprise SaaS Viewport with On-Demand Version & Audit History Side Panel
// =============================================================================

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { InteriorShell } from '@/components/interior/InteriorShell';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';
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
  Send,
  UploadCloud,
  History,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Info,
  Play,
  Pause,
  RotateCcw,
  Check,
  FileCheck2,
  Copy,
  Loader2,
  X,
  SlidersHorizontal,
  Calendar,
  User,
  PanelRightOpen,
  PanelRightClose,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { cn } from '@/lib/utils';
import { InteriorDrawingApprovalModal } from '@/features/interior-new/components/crm/modals/InteriorDrawingApprovalModal';
import { InteriorUploadRevisionModal } from '@/features/interior-new/components/crm/modals/InteriorUploadRevisionModal';
import { InteriorSendDrawingForApprovalModal } from '@/features/interior-new/components/crm/modals/InteriorSendDrawingForApprovalModal';
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
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'tiff', 'hdr', 'exr', 'ico', 'avif'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['dwg', 'skp', 'obj', 'fbx', '3ds', 'dae', 'blend', 'rvt', 'rfa', 'ifc', 'gltf', 'glb', 'max'].includes(ext)) return '3d-model';
  if (['dxf'].includes(ext)) return 'cad-2d';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';

  // Check URL signatures (e.g. Cloudinary, data URLs, S3)
  if (url.includes('/image/upload/') || url.startsWith('data:image/') || url.includes('/images/')) return 'image';
  if (url.includes('.pdf') || url.includes('/pdf/')) return 'pdf';

  // Check Category fallback
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

export default function DrawingViewerPage() {
  const checked = useInteriorAuthGuard();
  const params = useParams();
  const router = useRouter();
  const toast = useToast();

  const customerId = (params?.id || '') as string;
  const rawDrawingId = (params?.drawingId || '') as string;
  const drawingId = decodeURIComponent(rawDrawingId);

  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<any>(null);
  const [drawing, setDrawing] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

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
  const [bgColor, setBgColor] = useState('#f1f5f9');

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const currentModelRef = useRef<THREE.Object3D | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Modal States
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [isSendApprovalModalOpen, setIsSendApprovalModalOpen] = useState(false);
  const [approvingDirect, setApprovingDirect] = useState(false);

  // Fetch Lead & Users Data
  const loadDrawingData = async () => {
    try {
      setLoading(true);
      const [leadRes, usersRes, actRes] = await Promise.all([
        interiorCrmService.getCustomerById(customerId),
        interiorCrmService.getUsers().catch(() => ({ data: [] })),
        interiorCrmService.getActivities(customerId).catch(() => ({ data: [] }))
      ]);

      const customerData = leadRes?.data || leadRes;
      setLead(customerData);
      setUsers(usersRes?.data || []);
      const actData = actRes?.success && actRes?.data ? actRes.data : Array.isArray(actRes) ? actRes : [];
      setActivities(actData);

      const allFiles = customerData?.designFiles || (customerData as any)?.designs || [];
      const found = allFiles.find(
        (d: any, idx: number) =>
          d._id?.toString() === drawingId ||
          d.id?.toString() === drawingId ||
          String(d._id) === String(drawingId) ||
          String(d.id) === String(drawingId) ||
          d.name === drawingId ||
          d.title === drawingId ||
          d.url === drawingId ||
          String(idx) === String(drawingId)
      );

      if (found) {
        setDrawing(found);
        const versions = found.versions || [];
        const highest = found.currentVersion || (versions.length > 0 ? Math.max(...versions.map((v: any) => v.versionNumber || 1)) : 1);
        setSelectedVersionNum(highest);
      } else {
        toast.error('Drawing not found in this lead');
      }
    } catch (err: any) {
      console.error('Failed to fetch drawing data', err);
      toast.error('Failed to load drawing. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId && drawingId) {
      loadDrawingData();
    }
  }, [customerId, drawingId]);

  // Compile Normalized Versions List
  const allVersions = useMemo(() => {
    if (!drawing) return [];
    const versionsList: any[] = Array.isArray(drawing.versions) && drawing.versions.length > 0
      ? [...drawing.versions]
      : [];

    if (versionsList.length === 0) {
      versionsList.push({
        versionNumber: drawing.currentVersion || 1,
        name: drawing.title || drawing.name || 'Drawing Blueprint',
        url: drawing.url,
        fileType: drawing.fileType,
        category: drawing.category,
        uploadedAt: drawing.uploadedAt,
        approvalStatus: drawing.approvalStatus || drawing.status || 'draft',
        clientStatus: drawing.clientStatus,
        internalNotes: drawing.internalNotes,
        rejectionReason: drawing.rejectionReason,
        assignedReviewerName: drawing.assignedReviewerName
      });
    }

    return versionsList.sort((a, b) => (a.versionNumber || 1) - (b.versionNumber || 1));
  }, [drawing]);

  // Active Version Object
  const activeVersion = useMemo(() => {
    return allVersions.find((v) => v.versionNumber === selectedVersionNum) || allVersions[allVersions.length - 1] || drawing;
  }, [allVersions, selectedVersionNum, drawing]);

  const activeUrl = activeVersion?.url || drawing?.url || '';
  const activeTitle = drawing?.title || activeVersion?.title || drawing?.name || activeVersion?.name || 'Drawing Blueprint';
  const activeName = activeVersion?.name || drawing?.name || activeTitle;
  const activeVersionNum = activeVersion?.versionNumber || 1;
  const activeStatus = activeVersion?.approvalStatus || activeVersion?.status || (activeVersion === drawing ? (drawing?.approvalStatus || drawing?.status) : 'draft') || 'draft';
  const activeUploadedAt = activeVersion?.uploadedAt || drawing?.uploadedAt;
  const activeReviewerName = activeVersion?.assignedReviewerName || drawing?.assignedReviewerName;

  // Rejection Reason ONLY if this version is rejected
  const isVersionRejected = activeStatus === 'internally_rejected' || activeVersion?.approvalStatus === 'internally_rejected';
  const activeRejectionReason = isVersionRejected ? (activeVersion?.rejectionReason || activeVersion?.internalNotes) : undefined;
  
  // Revision notes (when uploaded as revision and not rejected)
  const activeInternalNotes = !isVersionRejected ? activeVersion?.internalNotes : undefined;
  const activeClientFeedback = activeVersion?.clientFeedback;

  const explicitType = activeVersion?.fileType || drawing?.fileType;
  const effectiveCategory = activeVersion?.category || drawing?.category || '2D';
  const fileType = detectFileType(activeName, activeUrl, explicitType, effectiveCategory);
  const badgeInfo = getFileBadge(activeName, activeUrl, effectiveCategory, explicitType);
  const BadgeIcon = badgeInfo.icon;

  // Handover Note sent from previous stage (when passed from Requirements to Drawing)
  const drawingHandoff = useMemo(() => {
    const act = activities.find(
      (a) => (a.type === '2D/3D Drawing' || a.type === 'Design Phase' || a.type === 'Stage Handover') &&
             a.remarks &&
             !a.remarks.toLowerCase().includes('sent for internal approval') &&
             !a.remarks.toLowerCase().includes('approved') &&
             !a.remarks.toLowerCase().includes('rejected') &&
             !a.remarks.toLowerCase().includes('changes requested') &&
             !a.remarks.toLowerCase().startsWith('lead passed to 2d/3d drawing phase')
    ) || activities.find(
      (a) => (a.type === '2D/3D Drawing' || a.type === 'Design Phase') &&
             a.remarks &&
             !a.remarks.toLowerCase().includes('sent for internal approval') &&
             !a.remarks.toLowerCase().includes('approved') &&
             !a.remarks.toLowerCase().includes('rejected')
    );
    const rawNote = (lead as any)?.drawingHandoverNotes || (lead as any)?.designBrief || act?.remarks || '';
    const isGeneric = !rawNote || rawNote.trim().toLowerCase().startsWith('lead passed to') || rawNote.trim().toLowerCase() === 'status changed to under drawing';
    return {
      note: isGeneric ? '' : rawNote.trim(),
      createdAt: act?.createdAt,
      user: act?.user
    };
  }, [activities, lead]);

  const isDirect3DFormat = ['fbx', 'obj', 'gltf', 'glb'].includes(detectExt(activeUrl) || detectExt(activeName));
  const isImageFormat = fileType === 'image';
  const isPdfFormat = fileType === 'pdf';

  function detectExt(str?: string) {
    if (!str) return '';
    const clean = str.split('?')[0];
    const parts = clean.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  }

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

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
    rimLight.position.set(0, -100, 0);
    scene.add(rimLight);

    // Architectural Ground Grid
    const gridHelper = new THREE.GridHelper(200, 40, 0x6366f1, 0xcbd5e1);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // Load 3D Asset
    const ext = detectExt(activeUrl) || detectExt(activeName);

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
      setLoad3DError('Could not render 3D preview in browser. You can inspect drawing metadata directly.');
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

    // Render Animation Loop
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

  // 1-Click Direct Approval Handler
  const handleDirectApprove = async () => {
    if (!drawing || !customerId) return;
    setApprovingDirect(true);
    try {
      const dId = drawing._id || drawing.id || drawing.name;
      await interiorCrmService.approveDrawing(customerId, dId, {
        action: 'approve',
        versionNumber: activeVersionNum
      });
      toast.success(`Drawing Version v${activeVersionNum} approved!`);
      loadDrawingData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to approve drawing');
    } finally {
      setApprovingDirect(false);
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

  const getStatusPill = (status: string) => {
    if (status === 'internally_approved' || status === 'client_approved') {
      return {
        label: 'Approved',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        icon: CheckCircle2,
      };
    }
    if (status === 'internally_rejected' || status === 'client_changes_requested') {
      return {
        label: 'Changes Requested',
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        icon: XCircle,
      };
    }
    if (status === 'pending_internal_approval') {
      return {
        label: 'In Review',
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        icon: Clock,
      };
    }
    return {
      label: 'Draft',
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-400',
      icon: Layers,
    };
  };

  const viewport2DRef = useRef<HTMLDivElement>(null);

  // Professional Smooth Wheel Zoom toward mouse focal point (Figma / Miro style)
  const handleWheel = (e: React.WheelEvent) => {
    if (!isImageFormat) return;
    
    // Zoom factor based on wheel direction
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newZoom = Math.min(10, Math.max(0.1, Number((zoomLevel * zoomFactor).toFixed(3))));

    if (viewport2DRef.current) {
      const rect = viewport2DRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;

      // Keep the point under the mouse cursor stable during zoom
      const scaleChange = newZoom / zoomLevel;
      const newPanX = mouseX - (mouseX - panPosition.x) * scaleChange;
      const newPanY = mouseY - (mouseY - panPosition.y) * scaleChange;

      setPanPosition({ x: newPanX, y: newPanY });
    }

    setZoomLevel(newZoom);
  };

  // Professional Smooth Drag & Pan Handlers (Any zoom level / middle click / left click)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isImageFormat) return;
    if (e.button === 0 || e.button === 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isImageFormat) return;
    setPanPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Double click resets zoom & centering
  const handleDoubleClick = () => {
    if (!isImageFormat) return;
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  // Keyboard Navigation Shortcuts (Figma/Photoshop standard: +, -, 0, r)
  useEffect(() => {
    if (!isImageFormat) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        setZoomLevel((z) => Math.min(10, Number((z * 1.2).toFixed(2))));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoomLevel((z) => Math.max(0.1, Number((z / 1.2).toFixed(2))));
      } else if (e.key === '0') {
        e.preventDefault();
        setZoomLevel(1);
        setPanPosition({ x: 0, y: 0 });
        setRotation(0);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setRotation((r) => (r + 90) % 360);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImageFormat]);

  if (!checked) return null;

  if (loading) {
    return (
      <InteriorShell>
        <div className="p-16 flex flex-col items-center justify-center min-h-[70vh] text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 mb-3 shadow-2xs">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900">Loading Drawing Studio</h2>
          <p className="text-xs text-slate-500 mt-0.5">Fetching blueprint specifications and revision history...</p>
        </div>
      </InteriorShell>
    );
  }

  if (!drawing) {
    return (
      <InteriorShell>
        <div className="p-16 flex flex-col items-center justify-center min-h-[70vh] text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">Drawing Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">
            The requested drawing file may have been relocated or is unavailable for this lead account.
          </p>
          <Link
            href={`/interior-new/crm/leads/${customerId}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors"
          >
            <ArrowLeft size={14} /> Return to Lead Workspace
          </Link>
        </div>
      </InteriorShell>
    );
  }

  const isCurrentVersionDraft = activeStatus === 'draft';
  const isCurrentVersionPending = activeStatus === 'pending_internal_approval';
  const isCurrentVersionApproved = activeStatus === 'internally_approved' || activeStatus === 'client_approved';
  const isCurrentVersionRejected = activeStatus === 'internally_rejected' || activeVersion?.clientStatus === 'client_changes_requested';

  const activeStatusInfo = getStatusPill(activeStatus);
  const StatusIcon = activeStatusInfo.icon;

  return (
    <InteriorShell>
      <div className="h-[calc(100vh-4rem)] bg-white text-slate-900 font-sans flex flex-col antialiased overflow-hidden">
        
        {/* =========================================================================
            1. TOP HEADER & BREADCRUMBS (Edge-to-Edge)
           ========================================================================= */}
        <header className="shrink-0 bg-white border-b border-slate-200">
          <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            
            {/* Left: Breadcrumbs & Title */}
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href={`/interior-new/crm/leads/${customerId}`}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shrink-0"
                title="Return to Lead"
              >
                <ArrowLeft size={15} />
              </Link>

              <div className="flex items-center gap-2 min-w-0">
                <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Link href="/interior-new/crm" className="hover:text-slate-900 transition-colors">CRM</Link>
                  <ChevronRight size={11} className="text-slate-400 shrink-0" />
                  <Link href={`/interior-new/crm/leads/${customerId}`} className="hover:text-slate-900 transition-colors truncate max-w-[130px]">
                    {lead?.name || 'Lead'}
                  </Link>
                  <ChevronRight size={11} className="text-slate-400 shrink-0" />
                  <span className="text-slate-900 font-semibold truncate max-w-[240px]">{activeTitle}</span>
                </nav>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Version & History Drawer Toggle Button */}
              <button
                type="button"
                onClick={() => setShowSidePanel(!showSidePanel)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  showSidePanel
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
                title="Toggle Version Details & Audit History"
              >
                {showSidePanel ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                <span>Version & Audit ({allVersions.length})</span>
              </button>

              {isCurrentVersionDraft && (
                <button
                  type="button"
                  onClick={() => setIsSendApprovalModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
                >
                  <Send size={13} /> Send for Approval
                </button>
              )}

              {isCurrentVersionPending && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsApprovalModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                  >
                    <XCircle size={13} /> Rejected
                  </button>
                  <button
                    type="button"
                    onClick={handleDirectApprove}
                    disabled={approvingDirect}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 size={13} /> {approvingDirect ? 'Approving...' : 'Approve (v' + activeVersionNum + ')'}
                  </button>
                </>
              )}

              {isCurrentVersionRejected && (
                <button
                  type="button"
                  onClick={() => setIsRevisionModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
                >
                  <UploadCloud size={13} /> + Upload Revision (v{allVersions.length + 1})
                </button>
              )}
            </div>
          </div>
        </header>

        {/* =========================================================================
            2. SUBHEADER: VERSION TIMELINE STRIP (Edge-to-Edge)
           ========================================================================= */}
        <div className="shrink-0 bg-white border-b border-slate-200">
          <div className="w-full px-4 sm:px-6 py-2 flex items-center justify-between gap-4 overflow-x-auto">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium text-slate-500 mr-1 flex items-center gap-1">
                <History size={13} /> Versions:
              </span>

              {allVersions.map((ver: any) => {
                const isSelected = ver.versionNumber === activeVersionNum;
                const statusPill = getStatusPill(ver.approvalStatus || ver.status);
                const isLatest = ver.versionNumber === allVersions[allVersions.length - 1]?.versionNumber;

                return (
                  <button
                    key={ver.versionNumber}
                    type="button"
                    onClick={() => {
                      setSelectedVersionNum(ver.versionNumber);
                      setZoomLevel(1);
                      setRotation(0);
                      setPanPosition({ x: 0, y: 0 });
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>v{ver.versionNumber}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : statusPill.dot}`} />
                    {isLatest && (
                      <span className={`text-[9px] px-1 rounded uppercase font-semibold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        Latest
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
              <button
                type="button"
                onClick={() => setShowSidePanel(!showSidePanel)}
                className="hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>Status:</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.2 rounded text-[11px] font-semibold border ${activeStatusInfo.bg}`}>
                  <StatusIcon size={11} /> {activeStatusInfo.label}
                </span>
              </button>
              
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. WORKSPACE: FULL-WIDTH EDGE-TO-EDGE VIEWPORT WITH EMBEDDED DRAWER
           ========================================================================= */}
        <div className="w-full flex-1 flex flex-col overflow-hidden relative min-h-0">
          
          <div className="relative flex-1 flex overflow-hidden w-full h-full min-h-0 bg-white">
            
            {/* FULL CANVAS VIEWPORT (EDGE-TO-EDGE) */}
            <div className="relative flex-1 bg-slate-100 flex items-center justify-center overflow-hidden select-none min-h-0">
              
              {/* Top Viewport Status HUD */}
              <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-2 pointer-events-none">
                <div className="bg-white/95 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 text-xs font-medium flex items-center gap-1.5 shadow-xs backdrop-blur-xs">
                  <span className={`w-2 h-2 rounded-full ${
                    activeStatus === 'internally_approved' ? 'bg-emerald-500' :
                    activeStatus === 'internally_rejected' ? 'bg-rose-500' :
                    activeStatus === 'pending_internal_approval' ? 'bg-amber-500' : 'bg-slate-400'
                  }`} />
                  <span className="text-slate-700 text-[11px] font-mono font-semibold">v{activeVersionNum}</span>
                  {zoomLevel !== 1 && isImageFormat && (
                    <span className="text-indigo-600 text-[10px] font-mono font-semibold ml-0.5">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Viewport Canvas Body (Slight Greyish Studio Theme - Pro Interactive Zoom & Pan) */}
              <div
                ref={viewport2DRef}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDoubleClick={handleDoubleClick}
                className={`w-full h-full flex items-center justify-center relative bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] [background-size:24px_24px] bg-slate-100 select-none overflow-hidden touch-none ${
                  isImageFormat ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
                }`}
              >
                {isDirect3DFormat ? (
                  <>
                    <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
                    
                    {loading3D && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-xs text-slate-800">
                        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mb-2" />
                        <p className="text-xs font-semibold text-slate-800">Rendering 3D Model...</p>
                        {loading3DProgress > 0 && (
                          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{loading3DProgress}%</p>
                        )}
                      </div>
                    )}

                    {load3DError && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 p-6 text-center text-slate-800">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center mb-3 shadow-xs">
                          <Box size={22} />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-1">3D Viewport Notice</h3>
                        <p className="text-xs text-slate-500 max-w-sm">{load3DError}</p>
                      </div>
                    )}
                  </>
                ) : isImageFormat ? (
                  <div className="w-full h-full flex items-center justify-center p-8 sm:p-12 overflow-hidden relative pointer-events-none">
                    <img
                      src={activeUrl}
                      alt={activeTitle}
                      draggable={false}
                      style={{
                        transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.08s cubic-bezier(0.2, 0, 0, 1)'
                      }}
                      className="max-w-[75%] max-h-[65vh] object-contain select-none pointer-events-none will-change-transform"
                    />
                  </div>
                ) : isPdfFormat ? (
                  <div className="w-full h-full flex flex-col p-2 bg-slate-100/70">
                    <iframe
                      src={`${activeUrl}#toolbar=1&navpanes=0`}
                      title={activeTitle}
                      className="w-full h-full min-h-[680px] rounded-lg bg-white border border-slate-200 shadow-xs"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-800">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center mb-3 shadow-sm">
                      <Box size={24} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">CAD / BIM Model</h3>
                    <p className="text-xs text-slate-500 max-w-sm">
                      CAD/BIM model file available in native CAD suites.
                    </p>
                  </div>
                )}
              </div>

              {/* Viewport Control Dock (Bottom Center - White / Light Theme) */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                <div className="bg-white/95 border border-slate-200 rounded-lg p-1 flex items-center gap-1 text-slate-700 shadow-lg backdrop-blur-md">
                  {isDirect3DFormat ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAutoRotating(!isAutoRotating);
                          if (controlsRef.current) controlsRef.current.autoRotate = !isAutoRotating;
                        }}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isAutoRotating ? 'bg-slate-900 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                        title="Toggle Turntable"
                      >
                        {isAutoRotating ? <Pause size={13} /> : <Play size={13} />}
                        <span className="text-[11px]">Rotate</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !isWireframe;
                          setIsWireframe(nextState);
                          if (currentModelRef.current) {
                            currentModelRef.current.traverse((child) => {
                              if ((child as THREE.Mesh).isMesh) {
                                const mesh = child as THREE.Mesh;
                                if (Array.isArray(mesh.material)) {
                                  mesh.material.forEach((m: any) => {
                                    if ('wireframe' in m) m.wireframe = nextState;
                                  });
                                } else if (mesh.material && 'wireframe' in (mesh.material as any)) {
                                  (mesh.material as any).wireframe = nextState;
                                }
                              }
                            });
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isWireframe ? 'bg-slate-900 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                        title="Toggle Wireframe Mesh"
                      >
                        <Layers size={13} />
                        <span className="text-[11px]">Wireframe</span>
                      </button>

                      <div className="w-px h-4 bg-slate-200 mx-0.5" />

                      <div className="flex items-center gap-1 px-1">
                        {[
                          { color: '#ffffff', label: 'White' },
                          { color: '#f8fafc', label: 'Slate' },
                          { color: '#f1f5f9', label: 'Grey' },
                          { color: '#0f172a', label: 'Dark' }
                        ].map((bg) => (
                          <button
                            key={bg.color}
                            type="button"
                            onClick={() => setBgColor(bg.color)}
                            className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                              bgColor === bg.color ? 'border-indigo-600 scale-110 shadow-xs ring-1 ring-indigo-500' : 'border-slate-300 opacity-70 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: bg.color }}
                            title={bg.label}
                          />
                        ))}
                      </div>
                    </>
                  ) : isImageFormat ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.max(0.1, Number((z / 1.25).toFixed(2))))}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Zoom Out (-)"
                      >
                        <ZoomOut size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setZoomLevel(1);
                          setPanPosition({ x: 0, y: 0 });
                          setRotation(0);
                        }}
                        className="px-2 py-1 text-[11px] font-mono font-medium text-slate-700 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                        title="Reset View (0 / Double-Click)"
                      >
                        {Math.round(zoomLevel * 100)}%
                      </button>

                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.min(10, Number((z * 1.25).toFixed(2))))}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Zoom In (+)"
                      >
                        <ZoomIn size={14} />
                      </button>

                      <div className="w-px h-4 bg-slate-200 mx-0.5" />

                      <button
                        type="button"
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Rotate 90°"
                      >
                        <RotateCw size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setZoomLevel(1);
                          setRotation(0);
                          setPanPosition({ x: 0, y: 0 });
                        }}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Reset View"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </>
                  ) : null}

                  <div className="w-px h-4 bg-slate-200 mx-0.5" />

                  {/* Toggle Inspector Drawer from Control Dock */}
                  <button
                    type="button"
                    onClick={() => setShowSidePanel(!showSidePanel)}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                      showSidePanel ? 'bg-slate-900 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                    title="Toggle Version Details & Audit History"
                  >
                    <History size={13} />
                    <span className="text-[11px]">Audit ({allVersions.length})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* =========================================================================
                SLIDE-OVER SIDE SECTION (Inside the Viewer with Smooth Animation)
               ========================================================================= */}
            <AnimatePresence>
              {showSidePanel && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 380, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="w-[380px] max-w-[90vw] bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden shadow-2xl z-30"
                >
                  {/* Drawer Header */}
                  <div className="p-3.5 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                    <div className="flex items-center gap-2">
                      <History size={15} className="text-slate-700" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Version & Audit History
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSidePanel(false)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 transition-colors cursor-pointer"
                      title="Close Panel"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Segmented Tab Controls */}
                  <div className="p-3 pb-0">
                    <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setActiveTab('details')}
                        className={`py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                          activeTab === 'details'
                            ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Version v{activeVersionNum}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className={`py-1 text-xs font-medium rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                          activeTab === 'history'
                            ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>All Revisions</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-semibold">
                          {allVersions.length}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Drawer Content Body */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {activeTab === 'details' ? (
                      /* TAB 1: DETAILS */
                      <div className="space-y-4">
                        {/* Status Banner */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Approval State
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium border ${activeStatusInfo.bg}`}>
                            <StatusIcon size={12} /> {activeStatusInfo.label}
                          </span>
                        </div>

                        {/* Rejection Reason Notice (Strictly for this rejected version) */}
                        {isVersionRejected && activeRejectionReason && (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1.5">
                            <div className="flex items-center gap-1.5 text-rose-800 font-semibold text-xs">
                              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>Required Changes for v{activeVersionNum}:</span>
                            </div>
                            <p className="text-xs text-rose-950 font-normal bg-white p-2.5 rounded border border-rose-200/80 leading-relaxed">
                              {activeRejectionReason}
                            </p>
                          </div>
                        )}

                        {/* Revision Notes Notice */}
                        {!isVersionRejected && activeInternalNotes && (
                          <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-lg space-y-1.5">
                            <div className="flex items-center gap-1.5 text-indigo-900 font-semibold text-xs">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span>Revision Notes:</span>
                            </div>
                            <p className="text-xs text-indigo-950 font-normal bg-white p-2.5 rounded border border-indigo-200/80 leading-relaxed">
                              {activeInternalNotes}
                            </p>
                          </div>
                        )}

                        {/* Client Remarks Notice */}
                        {activeClientFeedback && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1.5">
                            <div className="flex items-center gap-1.5 text-amber-900 font-semibold text-xs">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Client Feedback:</span>
                            </div>
                            <p className="text-xs text-amber-950 font-normal bg-white p-2.5 rounded border border-amber-200/80 leading-relaxed">
                              {activeClientFeedback}
                            </p>
                          </div>
                        )}

                        {/* Design Brief & Layer Guidelines (From previous stage handover) */}
                        {drawingHandoff.note && (
                          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-blue-900 font-semibold text-xs">
                              <span className="flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>Design Brief & Layer Guidelines:</span>
                              </span>
                              {drawingHandoff.createdAt && (
                                <span className="text-[10px] text-blue-600/80 font-normal">
                                  {new Date(drawingHandoff.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-blue-950 font-normal bg-white p-2.5 rounded border border-blue-200/80 leading-relaxed whitespace-pre-wrap">
                              {drawingHandoff.note}
                            </p>
                          </div>
                        )}

                        {/* Key Specifications List */}
                        <div className="space-y-2.5 text-xs">
                          <div className="flex items-center justify-between text-slate-600 py-1.5 border-b border-slate-50">
                            <span className="text-slate-500">Drawing Title</span>
                            <span className="font-medium text-slate-900 truncate max-w-[190px]" title={activeTitle}>{activeTitle}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600 py-1.5 border-b border-slate-50">
                            <span className="text-slate-500">File Name</span>
                            <span className="font-medium text-slate-900 truncate max-w-[190px]" title={activeName}>{activeName}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600 py-1.5 border-b border-slate-50">
                            <span className="text-slate-500">Upload Date</span>
                            <span className="font-medium text-slate-900">
                              {activeUploadedAt ? new Date(activeUploadedAt).toLocaleString() : 'Recent'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600 py-1.5 border-b border-slate-50">
                            <span className="text-slate-500">Assigned Reviewer</span>
                            <span className="font-medium text-slate-900">
                              {activeReviewerName || 'Design Lead'}
                            </span>
                          </div>
                          {drawing.roomTag && (
                            <div className="flex items-center justify-between text-slate-600 py-1.5 border-b border-slate-50">
                              <span className="text-slate-500">Room Location</span>
                              <span className="font-medium text-slate-900">
                                {drawing.roomTag}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-slate-600 py-1.5">
                            <span className="text-slate-500">Blueprint Category</span>
                            <span className="font-medium text-slate-900">
                              {drawing.category || 'Architectural Blueprint'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* TAB 2: AUDIT HISTORY */
                      <div className="space-y-2.5">
                        {allVersions.map((ver: any) => {
                          const isSelected = ver.versionNumber === activeVersionNum;
                          const pill = getStatusPill(ver.approvalStatus || ver.status);
                          const Icon = pill.icon;

                          return (
                            <div
                              key={ver.versionNumber}
                              onClick={() => {
                                setSelectedVersionNum(ver.versionNumber);
                                setZoomLevel(1);
                                setRotation(0);
                                setPanPosition({ x: 0, y: 0 });
                              }}
                              className={`p-3 rounded-lg border transition-colors cursor-pointer space-y-1.5 ${
                                isSelected
                                  ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-slate-900">
                                  Version v{ver.versionNumber}
                                </span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${pill.bg}`}>
                                  <Icon size={10} /> {pill.label}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-600 truncate" title={drawing?.title || ver.title || ver.name || activeTitle}>
                                {drawing?.title || ver.title || ver.name || activeTitle}
                              </p>

                              {ver.rejectionReason && (
                                <p className="text-[10px] text-rose-700 bg-rose-50 p-1.5 rounded truncate">
                                  {ver.rejectionReason}
                                </p>
                              )}

                              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-100">
                                <span>{ver.uploadedAt ? new Date(ver.uploadedAt).toLocaleDateString() : 'v' + ver.versionNumber}</span>
                                <span className="font-medium text-slate-900">
                                  {isSelected ? 'Active in Viewport' : 'Switch Version'} &rarr;
                                </span>
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
        </div>

        {/* Modals for Direct Actions on this Page */}
        {isApprovalModalOpen && (
          <InteriorDrawingApprovalModal
            isOpen={isApprovalModalOpen}
            onClose={() => setIsApprovalModalOpen(false)}
            customerId={customerId}
            drawing={{ ...drawing, initialAction: 'reject', currentVersion: activeVersionNum }}
            onSuccess={loadDrawingData}
            users={users}
          />
        )}

        {isRevisionModalOpen && (
          <InteriorUploadRevisionModal
            isOpen={isRevisionModalOpen}
            onClose={() => setIsRevisionModalOpen(false)}
            customerId={customerId}
            drawing={drawing}
            onSuccess={loadDrawingData}
            users={users}
          />
        )}

        {isSendApprovalModalOpen && (
          <InteriorSendDrawingForApprovalModal
            isOpen={isSendApprovalModalOpen}
            onClose={() => setIsSendApprovalModalOpen(false)}
            customerId={customerId}
            drawing={drawing}
            onSuccess={loadDrawingData}
            users={users}
          />
        )}
      </div>
    </InteriorShell>
  );
}
