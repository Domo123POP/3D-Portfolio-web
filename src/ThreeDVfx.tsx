import { motion, AnimatePresence } from 'framer-motion';
import Scene from './Scene';
import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { Selection, EffectComposer, Outline, Select } from '@react-three/postprocessing';

// --- Import assets directly for Vite to handle paths ---
import cncModelUrl from '../media/glb/cnc_ok.glb';
import cubeModelUrl from '../media/glb/cube.glb';
import fishModelUrl from '../media/glb/fish.glb';
import octopusModelUrl from '../media/glb/octopus.glb';
import cncVfxWebm from '../media/webm/cnc_vfx.webm';
import cncVfxMp4 from '../media/mp4/cnc_vfx.mp4';
import cubeVfxWebm from '../media/webm/cube_vfx.webm';
import cubeVfxMp4 from '../media/mp4/cube_vfx.mp4';
import threejsLogoUrl from '../media/webp/threejs_logo.webp';
import fishThumbnailUrl from '../media/webp/fish.webp';

// 使用 Vite glob import 載入章魚圖片序列
const octopusFrames = import.meta.glob('../media/webp/octopus/*.webp', { eager: true, import: 'default' }) as Record<string, string>;
const octopusFrameUrls = Object.keys(octopusFrames)
  .sort()
  .map(key => octopusFrames[key]);

// --- 圖片序列播放組件 ---
function ImageSequencePlayer({ frames, fps = 24, className }: { frames: string[], fps?: number, className?: string }) {
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    if (frames.length === 0) return;

    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % frames.length);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [frames, fps]);

  if (frames.length === 0) return null;

  return (
    <img
      src={frames[currentFrame]}
      alt="Animation frame"
      className={className}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}

// 檢測是否為觸控設備（包含偽裝成 Mac 的 iPad）
const isTouchDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
// 檢測是否為平板設備（iPad）- 需排除 iPhone（iPhone UA 也包含 "Mac OS X"）
const isTabletDevice = /iPad/i.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Mac') && 'ontouchend' in document && !/iPhone/i.test(navigator.userAgent));
// 舊的 isMobileDevice 保留給後處理效果使用
const isMobileDevice = isTouchDevice;

// Augment JSX to allow <model-viewer>
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src: string;
        alt: string;
        'camera-controls'?: boolean;
        'auto-rotate'?: boolean;
        'shadow-intensity'?: string;
        style?: React.CSSProperties;
        onLoad?: () => void;
        'disable-pan'?: boolean;
        'disable-zoom'?: boolean;
        'disable-rotate'?: boolean;
        class?: string;
        'camera-orbit'?: string;
        ref?: React.Ref<HTMLElement>;
      }, HTMLElement>;
    }
  }
}

// --- Component to render the CNC model with R3F ---

// --- Invisible Model for Outline Effect (Desktop only - uses EffectComposer) ---
function InvisibleModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const invisibleScene = useMemo(() => {
    const clonedScene = scene.clone();
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false
        });
      }
    });
    return clonedScene;
  }, [scene]);

  return <primitive object={invisibleScene} rotation={[0, -Math.PI / 4, 0]} />;
}



// --- New, safe, declarative components for wireframe rendering ---

// Renders the line segments for a single mesh, memoizing the geometry calculation.
function WireframeMesh({ node }: { node: THREE.Mesh }) {
    // A mesh must have geometry to be rendered.
    if (!node.geometry) {
        return null;
    }
    const edges = useMemo(() => new THREE.EdgesGeometry(node.geometry, 15), [node.geometry]);
    return (
        <lineSegments
            geometry={edges}
            position={node.position}
            rotation={node.rotation}
            scale={node.scale}
        >
            <lineBasicMaterial color="white" toneMapped={false} />
        </lineSegments>
    );
}

// Recursively traverses the scene graph and rebuilds it declaratively.
function WireframeNode({ node }: { node: THREE.Object3D }) {
  // If it's a mesh with geometry, render the wireframe version of it.
  if ((node as THREE.Mesh).isMesh && (node as THREE.Mesh).geometry) {
    return <WireframeMesh node={node as THREE.Mesh} />;
  }

  // If it's not a renderable mesh but it has children, treat it as a group.
  // This will correctly handle THREE.Group, THREE.Scene, and any generic THREE.Object3D
  // that is used for hierarchical transformation.
  if (node.children && node.children.length > 0) {
    return (
      <group
        position={node.position}
        rotation={node.rotation}
        scale={node.scale}
      >
        {node.children.map(child => (
          <WireframeNode key={child.uuid} node={child} />
        ))}
      </group>
    );
  }
  
  // If it's a leaf node and not a valid mesh (e.g., a Light or Camera from the GLB), ignore it.
  return null;
}

// The main component that loads the GLTF and kicks off the recursive rendering.
function CncModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return (
    <group rotation={[0, -Math.PI / 4, 0]}>
      <WireframeNode node={scene} />
    </group>
  );
}

// --- Fresnel Silhouette Model for iPad/Mobile (純輪廓邊緣效果) ---
// 使用 Fresnel 著色器根據視角自動檢測並顯示模型邊緣
const fresnelVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fresnelFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  uniform float edgeThreshold;

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = 1.0 - abs(dot(viewDir, vNormal));

    // 使用硬切換：只有非常接近邊緣的地方才顯示
    // fresnel 接近 1.0 = 視線與表面幾乎平行（邊緣）
    // fresnel 接近 0.0 = 視線與表面垂直（正面）
    if (fresnel < edgeThreshold) discard;

    // 邊緣線條，不透明白色
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
`;

function FresnelSilhouetteMesh({ node }: { node: THREE.Mesh }) {
  if (!node.geometry) {
    return null;
  }

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: fresnelVertexShader,
      fragmentShader: fresnelFragmentShader,
      uniforms: {
        // 閾值越高，邊緣越細（0.85-0.95 之間調整）
        edgeThreshold: { value: 0.88 }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }, []);

  return (
    <mesh
      geometry={node.geometry}
      material={material}
      position={node.position}
      rotation={node.rotation}
      scale={node.scale}
    />
  );
}

function FresnelSilhouetteNode({ node }: { node: THREE.Object3D }) {
  if ((node as THREE.Mesh).isMesh && (node as THREE.Mesh).geometry) {
    return <FresnelSilhouetteMesh node={node as THREE.Mesh} />;
  }
  if (node.children && node.children.length > 0) {
    return (
      <group
        position={node.position}
        rotation={node.rotation}
        scale={node.scale}
      >
        {node.children.map(child => (
          <FresnelSilhouetteNode key={child.uuid} node={child} />
        ))}
      </group>
    );
  }
  return null;
}

function FresnelSilhouetteModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return (
    <group rotation={[0, -Math.PI / 4, 0]}>
      <FresnelSilhouetteNode node={scene} />
    </group>
  );
}

// --- Camera configuration constants ---
// Adjust these values to change camera position for mobile and desktop
const CNC_CAMERA_CONFIG = {
  desktop: {
    position: [8, 8, 8] as [number, number, number],
    fov: 50,
    target: [0, 4, 0] as [number, number, number]
  },
  mobile: {
    position: [10, 10, 10] as [number, number, number], // Adjust X, Y, Z position for mobile view
    fov: 50,
    target: [0, 6, 0] as [number, number, number]
  }
};

// --- Canvas container for the R3F CNC model ---
function CncModelViewer({ url }: { url: string; }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cameraConfig = isMobile ? CNC_CAMERA_CONFIG.mobile : CNC_CAMERA_CONFIG.desktop;

  return (
    <div className="main-glb-viewer"> {/* Use the same class to preserve styling */}
      <Canvas
        gl={{ powerPreference: 'high-performance' }}
        camera={{ position: cameraConfig.position, fov: cameraConfig.fov, up: [-Math.SQRT1_2, Math.SQRT1_2, 0] }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 5]} intensity={1}
        />
        <Suspense fallback={null}>
          {/* 桌面版：使用 EffectComposer 描邊效果 */}
          {!isMobileDevice && !isTabletDevice && (
            <Selection>
              <EffectComposer multisampling={8} autoClear={false}>
                <Outline
                  visibleEdgeColor={0xffffff}
                  hiddenEdgeColor={0xffffff}
                  edgeStrength={3}
                  width={1000}
                />
              </EffectComposer>
              <Select enabled>
                <InvisibleModel url={url} />
              </Select>
            </Selection>
          )}
          {/* iPad/手機：使用 Fresnel Shader 純輪廓邊緣效果（避免黑色方塊） */}
          {(isMobileDevice || isTabletDevice) && (
            <FresnelSilhouetteModel url={url} />
          )}
          <CncModel url={url} />
        </Suspense>
        {/* Re-enabled zoom to allow user to inspect */}
        <OrbitControls autoRotate enableZoom={true} enablePan={false} target={cameraConfig.target} />
      </Canvas>
    </div>
  );
}

// --- Components for Cube Model (Wireframe without Outline) ---

function CubeWireframeMesh({ node }: { node: THREE.Mesh }) {
    if (!node.geometry) {
        return null;
    }
    // Use threshold of 1 to show all edges
    const edges = useMemo(() => new THREE.EdgesGeometry(node.geometry, 1), [node.geometry]);
    return (
        <lineSegments
            geometry={edges}
            position={node.position}
            rotation={node.rotation}
            scale={node.scale}
        >
            <lineBasicMaterial color="white" toneMapped={false} />
        </lineSegments>
    );
}

function CubeWireframeNode({ node }: { node: THREE.Object3D }) {
  if ((node as THREE.Mesh).isMesh && (node as THREE.Mesh).geometry) {
    return <CubeWireframeMesh node={node as THREE.Mesh} />;
  }
  if (node.children && node.children.length > 0) {
    return (
      <group
        position={node.position}
        rotation={node.rotation}
        scale={node.scale}
      >
        {node.children.map(child => (
          <CubeWireframeNode key={child.uuid} node={child} />
        ))}
      </group>
    );
  }
  return null;
}

function CubeModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return (
    <group>
      <CubeWireframeNode node={scene} />
    </group>
  );
}

const CUBE_CAMERA_CONFIG = {
  desktop: {
    position: [12, 12, 12] as [number, number, number],
    fov: 50,
    target: [0, -1, 0] as [number, number, number]
  },
  mobile: {
    position: [14, 14, 14] as [number, number, number], // 繼續增加 Y 值讓物品更往上
    fov: 50,
    target: [0, 0, 0] as [number, number, number] // 同時調整 target 的 Y 值
  }
};

function CubeModelViewer({ url }: { url: string; }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cameraConfig = isMobile ? CUBE_CAMERA_CONFIG.mobile : CUBE_CAMERA_CONFIG.desktop;

  return (
    <div className="main-glb-viewer">
      <Canvas
        gl={{ powerPreference: 'high-performance' }}
        camera={{ position: cameraConfig.position, fov: cameraConfig.fov, up: [0, 1, 0] }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[0, 0, 0]} intensity={1} />
        <Suspense fallback={null}>
          <CubeModel url={url} />
        </Suspense>
        <OrbitControls autoRotate enableZoom={true} enablePan={false} target={cameraConfig.target} />
      </Canvas>
    </div>
  );
}

// --- Components for Fish Model (Wireframe) ---

function FishWireframeMesh({ node }: { node: THREE.Mesh }) {
    if (!node.geometry) {
        return null;
    }
    const edges = useMemo(() => new THREE.EdgesGeometry(node.geometry, 15), [node.geometry]);
    return (
        <lineSegments
            geometry={edges}
            position={node.position}
            rotation={node.rotation}
            scale={node.scale}
        >
            <lineBasicMaterial color="white" toneMapped={false} />
        </lineSegments>
    );
}

function FishWireframeNode({ node }: { node: THREE.Object3D }) {
  if ((node as THREE.Mesh).isMesh && (node as THREE.Mesh).geometry) {
    return <FishWireframeMesh node={node as THREE.Mesh} />;
  }
  if (node.children && node.children.length > 0) {
    return (
      <group
        position={node.position}
        rotation={node.rotation}
        scale={node.scale}
      >
        {node.children.map(child => (
          <FishWireframeNode key={child.uuid} node={child} />
        ))}
      </group>
    );
  }
  return null;
}

function FishModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return (
    <group rotation={[0, -Math.PI / 4, 0]}>
      <FishWireframeNode node={scene} />
    </group>
  );
}

const FISH_CAMERA_CONFIG = {
  desktop: {
    position: [8, 5, 8] as [number, number, number],
    fov: 50,
    target: [0, -1, 0] as [number, number, number]
  },
  mobile: {
    position: [12, 8, 12] as [number, number, number],
    fov: 50,
    target: [0, 0, 0] as [number, number, number]
  }
};

function FishModelViewer({ url }: { url: string; }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cameraConfig = isMobile ? FISH_CAMERA_CONFIG.mobile : FISH_CAMERA_CONFIG.desktop;

  return (
    <div className="main-glb-viewer">
      <Canvas
        gl={{ powerPreference: 'high-performance' }}
        camera={{ position: cameraConfig.position, fov: cameraConfig.fov, up: [0, 1, 0] }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Suspense fallback={null}>
          <FishModel url={url} />
        </Suspense>
        <OrbitControls autoRotate enableZoom={true} enablePan={false} target={cameraConfig.target} />
      </Canvas>
    </div>
  );
}

// --- Components for Octopus Model (Animated with Fresnel Edge) ---

// 帶動畫的 Octopus 模型 - 先用簡單的線框材質確認動畫正常
function OctopusModel({ url }: { url: string }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions, mixer } = useAnimations(animations, group);
  const materialsApplied = useRef(false);

  // 在場景載入後，替換材質為簡單的線框材質
  useEffect(() => {
    if (!materialsApplied.current) {
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          // 保存原始材質
          mesh.userData.originalMaterial = mesh.material;
          // 使用簡單的線框材質先測試
          mesh.material = new THREE.MeshBasicMaterial({
            color: 'white',
            wireframe: true,
            transparent: true,
            opacity: 0.3,
          });
        }
      });
      materialsApplied.current = true;
    }
  }, [scene]);

  // 播放所有動畫
  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      Object.values(actions).forEach(action => {
        if (action) {
          action.reset().play();
        }
      });
    }

    // 清理：組件卸載時停止動畫
    return () => {
      if (mixer) {
        mixer.stopAllAction();
      }
    };
  }, [actions, mixer]);

  return (
    <group ref={group} rotation={[0, -Math.PI / 4, 0]}>
      <primitive object={scene} />
    </group>
  );
}

const OCTOPUS_CAMERA_CONFIG = {
  desktop: {
    position: [12, 12, 12] as [number, number, number],
    fov: 50,
    target: [0, 0, 0] as [number, number, number]
  },
  mobile: {
    position: [10, 6, 10] as [number, number, number],
    fov: 50,
    target: [0, 0, 0] as [number, number, number]
  }
};

function OctopusModelViewer({ url }: { url: string; }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cameraConfig = isMobile ? OCTOPUS_CAMERA_CONFIG.mobile : OCTOPUS_CAMERA_CONFIG.desktop;

  return (
    <div className="main-glb-viewer">
      <Canvas
        gl={{ powerPreference: 'high-performance' }}
        camera={{ position: cameraConfig.position, fov: cameraConfig.fov, up: [0, 1, 0] }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Suspense fallback={null}>
          <OctopusModel url={url} />
        </Suspense>
        <OrbitControls autoRotate enableZoom={true} enablePan={false} target={cameraConfig.target} />
      </Canvas>
    </div>
  );
}

export default function ThreeDVfx() {
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const modelViewerRef = useRef<HTMLElement>(null);

  // 手機/iPad 點擊展開面板狀態
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768 || isTabletDevice);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);

  // 監聽螢幕尺寸變化
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768 || isTabletDevice);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 切換專案時重置面板狀態
  useEffect(() => {
    setIsPanelExpanded(false);
  }, [currentProjectIndex]);

  // 點擊切換面板展開/收合
  const togglePanel = () => {
    if (isMobile) {
      setIsPanelExpanded(!isPanelExpanded);
    }
  };

  // 節點線和箭頭的透明度（面板展開時淡出）
  const controlsOpacity = isPanelExpanded ? 0 : 1;

  const projects = [
    {
      title: '車床銑刀',
      description: '使用 Blender 進行硬表面建模，還原複雜的螺旋排屑槽。\n材質採用 Procedural Nodes，捨棄傳統PBR貼圖，精細控製刀刃的各向異性與金屬顆粒質感。\n透過 Cycles 的物理光線追蹤，達成照片級的渲染成果。',
      glbPath: cncModelUrl,
      mediaWebm: cncVfxWebm,
      mediaMp4: cncVfxMp4,
      mediaType: 'video' as const,
    },
    {
      title: '透明懸絲偶｜章魚',
      description: '為無獨有偶劇團《穿越真實的邊界》跨國製作打造的透明懸絲偶。\n以塑膠廢料再製為素材，使用 Blender 雕刻技術精準還原偶的造型與細節。\n模型包含骨骼綁定，可呈現流暢的動態效果。',
      glbPath: octopusModelUrl,
      imageSequence: octopusFrameUrls,
      imageSequenceFps: 24,
      mediaType: 'image-sequence' as const,
    },
    {
      title: '透明懸絲偶｜鯨魚骨',
      description: '為無獨有偶劇團《穿越真實的邊界》跨國製作打造的透明懸絲偶。\n以塑膠廢料再製為素材，使用 Blender 雕刻技術精準還原偶的造型與細節。',
      glbPath: fishModelUrl,
      mediaPath: fishThumbnailUrl,
      mediaType: 'image' as const,
    },
    {
      title: '多功能充電器',
      description: '機器人造型充電器的3D模型，針對產品接縫等做精細導角處理。\n使用EEVEE渲染引擎，橙青色調打光特效提升科技感。',
      glbPath: cubeModelUrl,
      mediaWebm: cubeVfxWebm,
      mediaMp4: cubeVfxMp4,
      mediaType: 'video' as const,
    },
    {
      title: "Domo's Portfolio 3D Web",
      description: '使用 Three.js、TypeScript 和 React框架打造的動態作品集頁面。\n以幾何邊界為視覺核心，將立方體轉化為乘載資訊的數位容器。',
      mediaPath: threejsLogoUrl,
      mediaType: 'image' as const,
    }
  ];

  const goToNextProject = () => {
    setCurrentProjectIndex((prev) => Math.min(prev + 1, projects.length - 1));
  };

  const goToPrevProject = () => {
    setCurrentProjectIndex((prev) => Math.max(prev - 1, 0));
  };

  useEffect(() => {
    if (projects[currentProjectIndex].title === '車床銑刀' || !projects[currentProjectIndex].glbPath) return;
    if (modelViewerRef.current) {
      const model = (modelViewerRef.current as any).model;
      modelViewerRef.current.style.transform = '';
      if (model) {
        model.rotation.y = 0;
      }
    }
  }, [currentProjectIndex, projects]);

  // 根據當前專案決定要渲染哪個背景 3D 模型
  const renderBackgroundModel = () => {
    const currentTitle = projects[currentProjectIndex].title;
    const glbPath = projects[currentProjectIndex].glbPath;

    if (currentTitle === "Domo's Portfolio 3D Web") {
      return <Scene enableHomeUI={false} />;
    }
    if (currentTitle === '車床銑刀' && glbPath) {
      return <CncModelViewer url={glbPath} />;
    }
    if (currentTitle.includes('章魚') && glbPath) {
      return <OctopusModelViewer url={glbPath} />;
    }
    if (currentTitle.includes('鯨魚骨') && glbPath) {
      return <FishModelViewer url={glbPath} />;
    }
    if (currentTitle === '多功能充電器' && glbPath) {
      return <CubeModelViewer url={glbPath} />;
    }
    return null;
  };

  return (
    <>
      {/* 背景層：Scene 方塊背景（非 Portfolio 3D Web 時顯示） */}
      {projects[currentProjectIndex].title !== "Domo's Portfolio 3D Web" &&
        <Scene initialPortfolioMode={true} enableHomeUI={false} />
      }

      {/* 3D 模型背景層：直接渲染在全螢幕，不受容器裁切 */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1,
        pointerEvents: 'auto'
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`model-${currentProjectIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ width: '100%', height: '100%' }}
          >
            {renderBackgroundModel()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* UI 層：導航、分頁、資訊面板 */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="navigation-container" style={{ pointerEvents: 'auto' }}>
          <div className="navigation-bounds">
            {currentProjectIndex > 0 && (
              <div className="nav-left">
                <button className="nav-arrow" onClick={goToPrevProject}>
                  ‹
                </button>
              </div>
            )}
            {currentProjectIndex < projects.length - 1 && (
              <div className="nav-right">
                <button className="nav-arrow" onClick={goToNextProject}>
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
        {/* 分頁指示器 - 固定在資訊欄上方 */}
        <div
          className="project-pagination"
          style={{
            position: 'fixed',
            bottom: isMobile ? '70px' : '265px',  // 桌面版在 info-box 上方
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: isMobile ? controlsOpacity : 1,
            transition: 'opacity 0.3s ease-out',
            pointerEvents: 'auto',
            zIndex: 10
          }}
        >
          {projects.map((_, index) => (
            <>
              <span key={`node-${index}`} className={index === currentProjectIndex ? 'active project-node' : 'project-node'} onClick={() => setCurrentProjectIndex(index)}></span>
              {index < projects.length - 1 && <div key={`line-${index}`} className="project-line"></div>}
            </>
          ))}
        </div>

        {/* 底部資訊列 - 手機/iPad 版點擊展開 */}
        <div
          className={`project-info-box ${isMobile ? 'mobile-panel' : ''} ${isPanelExpanded ? 'expanded' : ''}`}
          style={{ pointerEvents: 'auto' }}
        >
          {/* 手機/iPad 版點擊指示器 */}
          {isMobile && (
            <div className="panel-drag-handle" onClick={togglePanel}>
              <div className={`panel-chevron ${isPanelExpanded ? 'down' : 'up'}`}></div>
            </div>
          )}
          <div className="project-info-box-inner">
            <div className="project-text-content">
              <h2>{projects[currentProjectIndex].title}</h2>
              <p>{projects[currentProjectIndex].description}</p>
            </div>
            <div className="divider"></div>
            {(() => {
              const project = projects[currentProjectIndex];
              if (project.mediaType === 'video' && 'mediaWebm' in project) {
                return (
                  <div className="project-video-container">
                    <video key={currentProjectIndex} loop muted autoPlay playsInline className="project-video">
                      <source src={project.mediaWebm} type="video/webm" />
                      <source src={project.mediaMp4} type="video/mp4" />
                    </video>
                  </div>
                );
              } else if (project.mediaType === 'image-sequence' && 'imageSequence' in project) {
                return (
                  <div className="project-video-container">
                    <ImageSequencePlayer
                      key={currentProjectIndex}
                      frames={project.imageSequence}
                      fps={project.imageSequenceFps || 24}
                      className="project-video"
                    />
                  </div>
                );
              } else if ('mediaPath' in project && project.mediaPath) {
                return (
                  <div className="project-video-container">
                    <img key={currentProjectIndex} src={project.mediaPath} alt={project.title} className="project-video" />
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>
    </>
  );
}
