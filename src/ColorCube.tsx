import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

interface ColorCubeProps {
  color: string;
  position: [number, number, number];
}

export default function ColorCube({ color, position }: ColorCubeProps) {
  const mesh = useRef<Mesh>(null);

  useFrame((_state, delta) => {
    if (mesh.current) {
      // Floating animation
      mesh.current.position.y = position[1] + Math.sin(_state.clock.elapsedTime + position[0]) * 0.2;
      
      // Rotation
      mesh.current.rotation.x += delta * 0.1;
      mesh.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <mesh ref={mesh} position={position}>
      <boxGeometry args={[0.5, 0.5, 1.5]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
    </mesh>
  );
}