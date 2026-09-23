'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  X,
  Box,
  RotateCcw,
  Play,
  Pause,
  Download,
  Maximize2,
  Minimize2,
  Layers,
  Loader2,
  Eye,
  FileText,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  MessageSquare,
  AlertCircle,
  Archive,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  file: any;
}

export const Interior3DViewerModal = ({ isOpen, onClose, file }: Props) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isWireframe, setIsWireframe] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bgColor, setBgColor] = useState('#0f172a'); // default slate-900
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(1);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const currentModelRef = useRef<THREE.Object3D | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const getExt = (str?: string) => {
    if (!str) return '';
    const clean = str.split('?')[0];
    const parts = clean.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  };

  // Compile all versions
  const allVersions = useMemo(() => {
    if (!file) return [];
    const versionsList: any[] = Array.isArray(file.versions) && file.versions.length > 0
      ? [...file.versions]
      : [];

    if (versionsList.length === 0) {
      versionsList.push({
        versionNumber: file.currentVersion || 1,
        name: file.title || file.name || 'Drawing Blueprint',
        url: file.url,
        fileType: file.fileType,
        category: file.category,
        uploadedAt: file.uploadedAt,
        approvalStatus: file.approvalStatus || file.status || 'draft',
        clientStatus: file.clientStatus,
        internalNotes: file.internalNotes,
        rejectionReason: file.rejectionReason,
        assignedReviewerName: file.assignedReviewerName
      });
    }

    // Sort ascending by versionNumber
    return versionsList.sort((a, b) => (a.versionNumber || 1) - (b.versionNumber || 1));
  }, [file]);

  // Set default selected version to current/highest version
  useEffect(() => {
    if (file && isOpen) {
      const highestVersion = file.currentVersion || (allVersions.length > 0
        ? Math.max(...allVersions.map((v: any) => v.versionNumber || 1))
        : 1);
      setSelectedVersionNum(highestVersion);
      setShowHistoryPanel(false);
    }
  }, [file, isOpen, allVersions]);

  // Active version object
  const activeVersion = useMemo(() => {
    return allVersions.find((v) => v.versionNumber === selectedVersionNum) || allVersions[allVersions.length - 1] || file;
  }, [allVersions, selectedVersionNum, file]);

  const activeUrl = activeVersion?.url || file?.url || '';
  const activeName = activeVersion?.name || file?.title || file?.name || 'Drawing Blueprint';
  const activeVersionNum = activeVersion?.versionNumber || 1;
  const activeStatus = activeVersion?.approvalStatus || activeVersion?.status || (activeVersion === file ? (file?.approvalStatus || file?.status) : 'draft') || 'draft';
  const activeClientStatus = activeVersion?.clientStatus;
  const activeUploadedAt = activeVersion?.uploadedAt || file?.uploadedAt;
  const activeReviewerName = activeVersion?.assignedReviewerName || file?.assignedReviewerName;

  // Rejection reason ONLY applies if this specific version is rejected
  const isVersionRejected = activeStatus === 'internally_rejected' || activeVersion?.approvalStatus === 'internally_rejected';
  const activeRejectionReason = isVersionRejected ? (activeVersion?.rejectionReason || activeVersion?.internalNotes) : undefined;
  
  // Revision notes (when uploaded as revision and not rejected)
  const activeInternalNotes = !isVersionRejected ? activeVersion?.internalNotes : undefined;
  const activeClientFeedback = activeVersion?.clientFeedback;

  const fileExt = getExt(activeUrl) || getExt(activeName) || '';
  const isDirect3DFormat = ['fbx', 'obj', 'gltf', 'glb'].includes(fileExt);
  const isImageFormat = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'tiff'].includes(fileExt);
  const isPdfFormat = fileExt === 'pdf';

  // 3D Rendering Effect
  useEffect(() => {
    if (!isOpen || !activeUrl || !isDirect3DFormat || !mountRef.current) return;

    setLoading(true);
    setLoadingProgress(0);
    setLoadError(null);

    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 550;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(100, 100, 100);

    // 3. Renderer setup
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

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = isAutoRotating;
    controls.autoRotateSpeed = 1.8;
    controlsRef.current = controls;

    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight1.position.set(100, 200, 100);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x90b0ff, 0.8);
    dirLight2.position.set(-100, -100, -100);
    scene.add(dirLight2);

    // 6. Grid Helper
    const gridHelper = new THREE.GridHelper(200, 20, 0x475569, 0x334155);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // 7. Model Loader Function
    const handleLoadedObject = (object: THREE.Object3D) => {
      currentModelRef.current = object;

      // Compute Bounding Box to Center & Scale
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      // Center model
      object.position.x += object.position.x - center.x;
      object.position.y += object.position.y - box.min.y;
      object.position.z += object.position.z - center.z;

      // Auto Scale
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const targetSize = 60;
        const scale = targetSize / maxDim;
        object.scale.set(scale, scale, scale);
      }

      // Enable shadows and default materials if missing
      object.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.side = THREE.DoubleSide;
          }
        }
      });

      scene.add(object);

      // Adjust camera
      camera.position.set(60, 50, 70);
      controls.target.set(0, 20, 0);
      controls.update();

      setLoading(false);
    };

    const onProgress = (xhr: ProgressEvent) => {
      if (xhr.lengthComputable) {
        const percent = Math.round((xhr.loaded / xhr.total) * 100);
        setLoadingProgress(percent);
      }
    };

    const onError = (err: any) => {
      console.error('Error loading 3D Model:', err);
      setLoadError('Failed to parse 3D model geometry. The file might require bundled texture assets.');
      setLoading(false);
    };

    // Load matching format
    try {
      if (fileExt === 'fbx') {
        const fbxLoader = new FBXLoader();
        fbxLoader.load(activeUrl, handleLoadedObject, onProgress, onError);
      } else if (fileExt === 'obj') {
        const objLoader = new OBJLoader();
        objLoader.load(activeUrl, handleLoadedObject, onProgress, onError);
      } else if (fileExt === 'gltf' || fileExt === 'glb') {
        const gltfLoader = new GLTFLoader();
        gltfLoader.load(
          activeUrl,
          (gltf) => handleLoadedObject(gltf.scene),
          onProgress,
          onError
        );
      }
    } catch (e: any) {
      setLoadError(e.message || 'Failed to initialize 3D loader');
      setLoading(false);
    }

    // 8. Animation Loop
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 9. Resize handler
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
  }, [isOpen, activeUrl, fileExt, isDirect3DFormat]);

  // Update Auto-Rotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoRotating;
    }
  }, [isAutoRotating]);

  // Update Background Color
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(bgColor);
    }
  }, [bgColor]);

  // Toggle Wireframe
  useEffect(() => {
    if (currentModelRef.current) {
      currentModelRef.current.traverse((child: any) => {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m: any) => (m.wireframe = isWireframe));
          } else {
            child.material.wireframe = isWireframe;
          }
        }
      });
    }
  }, [isWireframe]);

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.target.set(0, 20, 0);
    }
  };

  const getStatusPill = (status: string) => {
    if (status === 'internally_approved' || status === 'client_approved') {
      return {
        label: 'Approved',
        bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        dot: 'bg-emerald-500',
        icon: CheckCircle2
      };
    }
    if (status === 'internally_rejected' || status === 'client_changes_requested') {
      return {
        label: 'Rejected',
        bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        dot: 'bg-rose-500',
        icon: XCircle
      };
    }
    if (status === 'pending_internal_approval') {
      return {
        label: 'Pending Approval',
        bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        dot: 'bg-amber-500',
        icon: Clock
      };
    }
    return {
      label: 'Draft',
      bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
      dot: 'bg-slate-400',
      icon: Layers
    };
  };

  if (!isOpen || !file) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-hidden"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className={`bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col transition-all duration-300 shadow-2xl ${
            isFullscreen ? 'w-full h-full max-w-none max-h-none rounded-none' : 'w-full max-w-6xl h-[90vh]'
          }`}
        >
          {/* Main Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 px-4 sm:px-6 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] gap-3">
            <div className="flex items-center gap-3 overflow-hidden min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-500/20">
                {isDirect3DFormat ? <Box size={20} /> : <FileText size={20} />}
              </div>
              <div className="overflow-hidden min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-[hsl(var(--foreground))] truncate max-w-xs sm:max-w-md" title={activeName}>
                    {activeName}
                  </h2>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 shrink-0">
                    {fileExt.toUpperCase()} {isDirect3DFormat ? '3D Model' : 'Drawing'}
                  </span>
                  {file.roomTag && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                      {file.roomTag}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))] flex-wrap">
                  <span>Viewing <strong className="text-indigo-600 font-bold">Version v{activeVersionNum}</strong></span>
                  {activeUploadedAt && (
                    <span>• Uploaded {new Date(activeUploadedAt).toLocaleDateString()}</span>
                  )}
                  {activeReviewerName && (
                    <span>• Reviewer: <strong className="text-[hsl(var(--foreground))]">{activeReviewerName}</strong></span>
                  )}
                </div>
              </div>
            </div>

            {/* Version Switcher Bar & Action Tools */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-between sm:justify-end">
              {/* Version History Toggle Button */}
              <button
                type="button"
                onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all border cursor-pointer ${
                  showHistoryPanel
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border-[hsl(var(--border))]'
                }`}
                title="View all version changes & logs"
              >
                <History size={14} />
                <span>Versions ({allVersions.length})</span>
              </button>

              <a
                href={activeUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={activeName}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] text-xs font-bold rounded-xl transition-all border border-[hsl(var(--border))]"
                title={`Download v${activeVersionNum} File`}
              >
                <Download size={14} /> Download v{activeVersionNum}
              </a>

              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-full transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Version Navigation Bar (Tabs) */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-slate-900 border-b border-slate-800 text-white text-xs overflow-x-auto scrollbar-none gap-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                <History size={12} className="text-indigo-400" /> Select Version:
              </span>
              {allVersions.map((ver: any) => {
                const isSelected = ver.versionNumber === activeVersionNum;
                const statusPill = getStatusPill(ver.approvalStatus || ver.status);
                const StatusIcon = statusPill.icon;

                return (
                  <button
                    key={ver.versionNumber}
                    type="button"
                    onClick={() => setSelectedVersionNum(ver.versionNumber)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span>v{ver.versionNumber}</span>
                    <StatusIcon size={11} className={isSelected ? 'text-white' : statusPill.dot.replace('bg-', 'text-')} />
                    {ver.versionNumber === allVersions[allVersions.length - 1]?.versionNumber && (
                      <span className="text-[9px] px-1 py-0.2 bg-white/20 rounded font-extrabold text-white">Latest</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Current Selected Version Status Pill */}
            <div className="flex items-center gap-2 shrink-0">
              {(() => {
                const statusPill = getStatusPill(activeStatus);
                const StatusIcon = statusPill.icon;
                return (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusPill.bg}`}>
                    <StatusIcon size={12} />
                    <span>v{activeVersionNum} Status: {statusPill.label}</span>
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Main Viewer Body with Side History Drawer */}
          <div className="relative flex-1 flex overflow-hidden">
            {/* Viewer Canvas */}
            <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden">
              {isDirect3DFormat ? (
                <>
                  {/* Three.js Canvas Mount */}
                  <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

                  {/* Loading State */}
                  {loading && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm text-white">
                      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
                      <p className="font-bold text-sm">Loading 3D Model (v{activeVersionNum})...</p>
                      {loadingProgress > 0 && (
                        <p className="text-xs text-indigo-300 mt-1">{loadingProgress}% downloaded</p>
                      )}
                    </div>
                  )}

                  {/* Error Fallback */}
                  {loadError && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95 p-8 text-center text-white">
                      <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                        <Box size={32} />
                      </div>
                      <h3 className="text-lg font-black mb-1">3D File (v{activeVersionNum}) Ready for Download</h3>
                      <p className="text-xs text-slate-400 max-w-md mb-6">{loadError}</p>
                      <a
                        href={activeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2"
                      >
                        <Download size={15} /> Download {fileExt.toUpperCase()} File
                      </a>
                    </div>
                  )}

                  {/* Floating Interactive 3D Toolbar */}
                  {!loading && !loadError && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2 px-3 backdrop-blur-md">
                      {/* Auto Rotate */}
                      <button
                        type="button"
                        onClick={() => setIsAutoRotating(!isAutoRotating)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          isAutoRotating
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Toggle Auto Rotation"
                      >
                        {isAutoRotating ? <Pause size={14} /> : <Play size={14} />}
                        <span>Orbit</span>
                      </button>

                      {/* Wireframe */}
                      <button
                        type="button"
                        onClick={() => setIsWireframe(!isWireframe)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          isWireframe
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Toggle Wireframe"
                      >
                        <Layers size={14} />
                        <span>Wireframe</span>
                      </button>

                      {/* Reset Camera */}
                      <button
                        type="button"
                        onClick={resetCamera}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Reset View"
                      >
                        <RotateCcw size={14} />
                        <span>Reset</span>
                      </button>

                      <div className="w-[1px] h-5 bg-slate-700 mx-1" />

                      {/* Background Color Toggles */}
                      <div className="flex items-center gap-1">
                        {[
                          { color: '#0f172a', label: 'Dark Slate' },
                          { color: '#000000', label: 'Pure Black' },
                          { color: '#1e293b', label: 'Studio Grey' },
                          { color: '#0c4a6e', label: 'Blueprint' }
                        ].map((bg, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setBgColor(bg.color)}
                            className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer ${
                              bgColor === bg.color ? 'border-indigo-400 scale-110' : 'border-slate-600 hover:scale-105'
                            }`}
                            style={{ backgroundColor: bg.color }}
                            title={bg.label}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : isImageFormat ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 overflow-auto">
                  <img
                    src={activeUrl}
                    alt={activeName}
                    className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl bg-white/5"
                  />
                </div>
              ) : isPdfFormat ? (
                <div className="w-full h-full flex flex-col p-2 bg-slate-950">
                  <iframe
                    src={`${activeUrl}#toolbar=1&navpanes=0`}
                    title={activeName}
                    className="w-full h-full rounded-2xl bg-white border-0"
                  />
                </div>
              ) : (
                /* CAD DWG / DXF / SKP / RVT / Archive Format Card */
                <div className="w-full h-full flex flex-col items-center justify-center p-8 sm:p-12 text-center text-white">
                  <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-5 shadow-2xs">
                    <Box size={40} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{activeName}</h3>
                  <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                    This <strong>.{fileExt.toUpperCase()}</strong> architectural format for <strong>v{activeVersionNum}</strong> is optimized for native CAD & modeling engines (AutoCAD, SketchUp, Revit, 3ds Max).
                  </p>
                  <div className="flex items-center gap-3">
                    <a
                      href={activeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={activeName}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-indigo-600/30 cursor-pointer"
                    >
                      <Download size={16} /> Download v{activeVersionNum} ({fileExt.toUpperCase()})
                    </a>
                  </div>
                </div>
              )}

              {/* Version Reason / Feedback Overlay Notice on Canvas */}
              {(activeRejectionReason || activeInternalNotes || activeClientFeedback) && (
                <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none">
                  <div className="max-w-xl mx-auto space-y-2 pointer-events-auto">
                    {activeRejectionReason && (
                      <div className="p-3 bg-rose-950/90 border border-rose-800/80 rounded-xl text-xs text-rose-200 backdrop-blur-md shadow-lg flex items-start gap-2.5">
                        <XCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-rose-300">Rejection Reason for v{activeVersionNum}:</p>
                          <p className="text-[11px] text-rose-100 mt-0.5 font-medium">{activeRejectionReason}</p>
                        </div>
                      </div>
                    )}
                    {activeInternalNotes && !activeRejectionReason && (
                      <div className="p-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-slate-200 backdrop-blur-md shadow-lg flex items-start gap-2.5">
                        <AlertCircle size={15} className="text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-indigo-300">Version v{activeVersionNum} Notes:</p>
                          <p className="text-[11px] text-slate-300 mt-0.5 font-medium">{activeInternalNotes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Side Version History & Details Panel */}
            <AnimatePresence>
              {showHistoryPanel && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 340, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-[340px] bg-[hsl(var(--card))] border-l border-[hsl(var(--border))] flex flex-col shrink-0 overflow-hidden shadow-2xl z-30"
                >
                  <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--muted)/0.4)]">
                    <div className="flex items-center gap-2">
                      <History size={16} className="text-indigo-600" />
                      <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">Version History</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowHistoryPanel(false)}
                      className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {allVersions.map((ver: any) => {
                      const isSelected = ver.versionNumber === activeVersionNum;
                      const statusPill = getStatusPill(ver.approvalStatus || ver.status);
                      const StatusIcon = statusPill.icon;

                      return (
                        <div
                          key={ver.versionNumber}
                          onClick={() => setSelectedVersionNum(ver.versionNumber)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-xs'
                              : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted)/0.5)]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-[hsl(var(--foreground))]">
                                Version v{ver.versionNumber}
                              </span>
                              {ver.versionNumber === allVersions[allVersions.length - 1]?.versionNumber && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-indigo-600 text-white rounded-md font-bold">
                                  Current
                                </span>
                              )}
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border ${statusPill.bg}`}>
                              <StatusIcon size={10} />
                              {statusPill.label}
                            </span>
                          </div>

                          <p className="text-xs font-medium text-[hsl(var(--foreground))] line-clamp-1" title={ver.name}>
                            {ver.name || activeName}
                          </p>

                          <div className="text-[10px] text-[hsl(var(--muted-foreground))] space-y-1 pt-1 border-t border-[hsl(var(--border))]">
                            {ver.uploadedAt && (
                              <div className="flex items-center gap-1">
                                <Calendar size={11} className="text-slate-400" />
                                <span>{new Date(ver.uploadedAt).toLocaleString()}</span>
                              </div>
                            )}
                            {ver.assignedReviewerName && (
                              <div className="flex items-center gap-1">
                                <User size={11} className="text-slate-400" />
                                <span>Reviewer: {ver.assignedReviewerName}</span>
                              </div>
                            )}
                          </div>

                          {/* Version Specific Notes */}
                          {(ver.approvalStatus === 'internally_rejected' || ver.status === 'internally_rejected') && (ver.rejectionReason || ver.internalNotes) && (
                            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg text-[10px] text-rose-800 dark:text-rose-300">
                              <strong>Rejection Reason (v{ver.versionNumber}):</strong> {ver.rejectionReason || ver.internalNotes}
                            </div>
                          )}

                          {ver.approvalStatus !== 'internally_rejected' && ver.status !== 'internally_rejected' && ver.internalNotes && (
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] text-slate-700 dark:text-slate-300">
                              <strong>Revision Changelog:</strong> {ver.internalNotes}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                              {isSelected ? 'Currently Viewing' : 'Click to View'}
                              <ChevronRight size={11} />
                            </span>
                            <a
                              href={ver.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              download={ver.name || `drawing-v${ver.versionNumber}`}
                              className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded transition"
                              title="Download this version"
                            >
                              <Download size={12} />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
