'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Box,
  RotateCcw,
  Play,
  Pause,
  Download,
  Maximize2,
  Minimize2,
  ExternalLink,
  Layers,
  Sparkles,
  Info,
  Loader2,
  Sun,
  Eye,
  FileText
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
  file: {
    name: string;
    url: string;
    fileType?: string;
    category?: string;
  } | null;
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
  const fileExt = getExt(file?.url) || getExt(file?.name) || '';
  const isDirect3DFormat = ['fbx', 'obj', 'gltf', 'glb'].includes(fileExt);
  const isImageFormat = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'].includes(fileExt);
  const isPdfFormat = fileExt === 'pdf';

  useEffect(() => {
    if (!isOpen || !file || !isDirect3DFormat || !mountRef.current) return;

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

    // 6. Grid Helper & Shadow Plane
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
      object.position.y += object.position.y - box.min.y; // Sit on ground grid
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
        fbxLoader.load(file.url, handleLoadedObject, onProgress, onError);
      } else if (fileExt === 'obj') {
        const objLoader = new OBJLoader();
        objLoader.load(file.url, handleLoadedObject, onProgress, onError);
      } else if (fileExt === 'gltf' || fileExt === 'glb') {
        const gltfLoader = new GLTFLoader();
        gltfLoader.load(
          file.url,
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
  }, [isOpen, file, fileExt, isDirect3DFormat]);

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

  if (!isOpen || !file) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300 ${
            isFullscreen ? 'w-full h-full max-w-none max-h-none rounded-none' : 'w-full max-w-5xl h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 px-6 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)]">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <Box size={20} />
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-[hsl(var(--foreground))] truncate max-w-md">
                    {file.name}
                  </h2>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 border border-purple-500/20">
                    {fileExt.toUpperCase()} {isDirect3DFormat ? '3D Interactive Model' : 'Drawing File'}
                  </span>
                </div>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                  {isDirect3DFormat
                    ? 'Left-click to Rotate • Right-click to Pan • Scroll wheel to Zoom'
                    : 'High resolution visual preview'}
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2">
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                download={file.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] text-xs font-bold rounded-xl transition-all border border-[hsl(var(--border))]"
                title="Download 3D Model"
              >
                <Download size={14} /> Download
              </a>

              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-full transition-colors ml-1"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Viewer Container */}
          <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden">
            {isDirect3DFormat ? (
              <>
                {/* Three.js Canvas Mount */}
                <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

                {/* Loading State */}
                {loading && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm text-white">
                    <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-3" />
                    <p className="font-bold text-sm">Loading 3D Model...</p>
                    {loadingProgress > 0 && (
                      <p className="text-xs text-purple-300 mt-1">{loadingProgress}% downloaded</p>
                    )}
                  </div>
                )}

                {/* Error Fallback */}
                {loadError && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95 p-8 text-center text-white">
                    <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                      <Box size={32} />
                    </div>
                    <h3 className="text-lg font-black mb-1">3D File Ready for Download</h3>
                    <p className="text-xs text-slate-400 max-w-md mb-6">{loadError}</p>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30"
                    >
                      <Download size={15} /> Download {fileExt.toUpperCase()} File
                    </a>
                  </div>
                )}

                {/* Floating Interactive 3D Toolbar */}
                {!loading && !loadError && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2 px-3 shadow-2xl backdrop-blur-md">
                    {/* Auto Rotate */}
                    <button
                      type="button"
                      onClick={() => setIsAutoRotating(!isAutoRotating)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        isAutoRotating
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        isWireframe
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
                          className={`w-5 h-5 rounded-full border-2 transition-all ${
                            bgColor === bg.color ? 'border-purple-400 scale-110' : 'border-slate-600 hover:scale-105'
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
              <div className="w-full h-full flex items-center justify-center p-6">
                <img
                  src={file.url}
                  alt={file.name}
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                />
              </div>
            ) : isPdfFormat ? (
              <div className="w-full h-full flex flex-col p-2 bg-slate-950">
                <iframe
                  src={`${file.url}#toolbar=1&navpanes=0`}
                  title={file.name}
                  className="w-full h-full rounded-2xl bg-white border-0"
                />
              </div>
            ) : (
              /* CAD DWG / SKP / RVT / Archive Format Card */
              <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center text-white">
                <div className="w-20 h-20 rounded-3xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-5 shadow-2xl">
                  <Box size={40} />
                </div>
                <h3 className="text-xl font-black mb-2">{file.name}</h3>
                <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                  This <strong>.{fileExt.toUpperCase()}</strong> architectural format is optimized for native CAD and 3D modeling tools (AutoCAD, SketchUp, Revit, 3ds Max).
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={file.name}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all active:scale-95"
                  >
                    <Download size={16} /> Download {fileExt.toUpperCase()} Model
                  </a>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
