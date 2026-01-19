import { useGLTF, OrbitControls, Center } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';

function Model(props: any) {
  const { scene } = useGLTF('/glb_file/cnc_ok.glb');
  return <primitive object={scene} {...props} />;
}

export default function CncModel() {
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '80vw',
      height: '80vh',
      zIndex: 2
    }}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 10], fov: 45 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={1.2} />
          <hemisphereLight intensity={1.5} groundColor="black" />
          <directionalLight position={[10, 10, 5]} intensity={2} />
          <Center>
            <Model scale={1000} />
          </Center>
          <OrbitControls />
        </Suspense>
      </Canvas>
    </div>
  );
}
