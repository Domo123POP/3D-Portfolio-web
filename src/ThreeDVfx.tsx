import { motion, AnimatePresence } from 'framer-motion';
import Scene from './Scene';
import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Selection, EffectComposer, Outline, Select } from '@react-three/postprocessing';

// --- Import assets directly for Vite to handle paths ---
import cncModelUrl from '../glb_file/cnc_ok.glb';
import cubeModelUrl from '../glb_file/cube.glb';
import cncGifUrl from '../gif/cnc_gif.gif';
import cubeGifUrl from '../gif/cube_gif.gif';
import headshotImageUrl from '../png/headshot.png';
import threejsLogoUrl from '../png/threejs_logo.png';

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

// --- Invisible Model for Outline Effect ---
function InvisibleModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const invisibleScene = useMemo(() => {
    const clonedScene = scene.clone();
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.material = new THREE.MeshBasicMaterial({
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

// --- Camera configuration constants ---
// Adjust these values to change camera position for mobile and desktop
const CNC_CAMERA_CONFIG = {
  desktop: {
    position: [6, 6, 6] as [number, number, number],
    fov: 50,
    target: [0, 5, 0] as [number, number, number]
  },
  mobile: {
    position: [6, 6, 6] as [number, number, number], // Adjust X, Y, Z position for mobile view
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
          <Selection>
            <EffectComposer multisampling={8} autoClear={false}>
              <Outline
                visibleEdgeColor="white"
                hiddenEdgeColor="white"
                edgeStrength={3}
                width={1000}
              />
            </EffectComposer>
            <Select enabled>
              <InvisibleModel url={url} />
            </Select>
          </Selection>
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
    position: [8, 8, 8] as [number, number, number],
    fov: 50,
    target: [0, 1, 0] as [number, number, number]
  },
  mobile: {
    position: [8, 8, 8] as [number, number, number], // 繼續增加 Y 值讓物品更往上
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
        camera={{ position: cameraConfig.position, fov: cameraConfig.fov, up: [-Math.SQRT1_2, Math.SQRT1_2, 0] }}>
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

export default function ThreeDVfx() {
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const modelViewerRef = useRef<HTMLElement>(null);

  const projects = [
    {
      title: '車床銑刀',
      description: '使用 Blender 進行硬表面建模，還原複雜的螺旋排屑槽。\n材質採用 Procedural Nodes，捨棄傳統PBR貼圖，精細控製刀刃的各向異性與金屬顆粒質感。\n透過 Cycles 的物理光線追蹤，達成照片級的渲染成果。',
      glbPath: cncModelUrl, // Use imported URL
      mediaPath: cncGifUrl,
      mediaType: 'image',
      imagePath: 'https://placehold.co/1920x1080/111/fff?text=Rendered+Image',
    },
    {
      title: '多功能充電器',
      description: '機器人造型充電器的3D模型，針對產品接縫等做精細導角處理。\n使用EEVEE渲染引擎，橙青色調打光特效提升科技感。',
      glbPath: cubeModelUrl, // Use imported URL
      mediaPath: cubeGifUrl,
      mediaType: 'image',
      imagePath: 'https://placehold.co/1920x1080/111/fff?text=Rendered+Image',
    },
    {
      title: "Domo's Portfolio 3D Web",
      description: '使用 Three.js、TypeScript 和 React框架打造的動態作品集頁面。\n以幾何邊界為視覺核心，將立方體轉化為乘載資訊的數位容器。',
      mediaPath: threejsLogoUrl,
      mediaType: 'image',
      imagePath: 'https://placehold.co/1920x1080/111/fff?text=Website+Screenshot',
    }
  ];

  const goToNextProject = () => {
    setCurrentProjectIndex((prev) => Math.min(prev + 1, projects.length - 1));
  };

  const goToPrevProject = () => {
    setCurrentProjectIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleModelLoad = useCallback(() => {
    if (modelViewerRef.current) {
      const model = (modelViewerRef.current as any).model;
      modelViewerRef.current.style.transform = '';
      if (model) {
        model.rotation.y = 0;
        model.traverse((node: any) => {
          if (node.isMesh && node.userData.originalMaterial) {
            node.material = node.userData.originalMaterial;
            node.visible = node.userData.originalVisible;
            if (node.userData.wireframeObject && node.parent) {
              node.parent.remove(node.userData.wireframeObject);
            }
            delete node.userData.wireframeObject;
            delete node.userData.originalMaterial;
            delete node.userData.originalVisible;
          }
        });
      }
    }
  }, []);

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

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.5, staggerChildren: 0.3 } } };
  const itemVariants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

  return (
    <>
      {projects[currentProjectIndex].title !== "Domo's Portfolio 3D Web" &&
        <Scene initialPortfolioMode={true} enableHomeUI={false} />
      }
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, paddingTop: '0', paddingBottom: '50px', overflowY: 'auto', overflowX: 'hidden' }}>
        <div className="navigation-container">
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
        <AnimatePresence mode="wait">
          <motion.div
            className="project-display"
            key={currentProjectIndex}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={itemVariants}
            style={{ top: '8%', position: 'absolute' }}
          >
            {projects[currentProjectIndex].title === "Domo's Portfolio 3D Web" ? (
              <div className="main-glb-container">
                <div className="main-glb-viewer" style={{ overflow: 'hidden', borderRadius: '10px' }}>
                  <Scene enableHomeUI={false} />
                </div>
              </div>
            ) : projects[currentProjectIndex].glbPath ? (
              <div className="main-glb-container">
                {(() => {
                  const currentTitle = projects[currentProjectIndex].title;
                  if (currentTitle === '車床銑刀') {
                    return <CncModelViewer url={projects[currentProjectIndex].glbPath} />;
                  }
                  if (currentTitle === '多功能充電器') {
                    return <CubeModelViewer url={projects[currentProjectIndex].glbPath} />;
                  }
                  return (
                    <model-viewer
                      src={projects[currentProjectIndex].glbPath}
                      alt={`3D model of ${projects[currentProjectIndex].title}`}
                      camera-controls
                      shadow-intensity="1"
                      disable-pan
                      disable-zoom
                      disable-rotate
                      class="main-glb-viewer"
                      camera-orbit="-45deg 75deg 100%"
                      ref={modelViewerRef}
                      onLoad={handleModelLoad}
                    ></model-viewer>
                  );
                })()}
              </div>
            ) : (
              // 保持空間佔位，避免 info-box 往上跳
              <div className="main-glb-container" style={{ pointerEvents: 'none' }}></div>
            )}
             <div className="project-pagination">
              {projects.map((_, index) => (
                <>
                  <span key={`node-${index}`} className={index === currentProjectIndex ? 'active project-node' : 'project-node'} onClick={() => setCurrentProjectIndex(index)}></span>
                  {index < projects.length - 1 && <div key={`line-${index}`} className="project-line"></div>}
                </>
              ))}
            </div>
            <div className="project-info-box">
              <div className="project-text-content">
                <h2>{projects[currentProjectIndex].title}</h2>
                <p>{projects[currentProjectIndex].description}</p>
              </div>
              <div className="divider"></div>
              {projects[currentProjectIndex].mediaPath && (
                <div className="project-video-container">
                  {projects[currentProjectIndex].mediaType === 'video' ? (
                    <video src={projects[currentProjectIndex].mediaPath} controls loop muted autoPlay playsInline poster="https://placehold.co/1920x1080/111/fff?text=Video+Poster" className="project-video"></video>
                  ) : (
                    <img src={projects[currentProjectIndex].mediaPath} alt={projects[currentProjectIndex].title} className="project-video" />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
