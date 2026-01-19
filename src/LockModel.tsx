import { useEffect } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';

// 定義 props 的類型，使用更通用的陣列類型以避免錯誤
interface LockModelProps {
  scale?: number | [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export default function LockModel({
  // 設定預設值，方便您直接在外部修改
  // 調整 Y 軸的縮放來解決壓扁的問題
  scale = [10, 10, 10],
  position = [0, -2, 0],
  rotation = [0, 1.58, 0]
}: LockModelProps) {  const gltf = useGLTF('../glb_file/lock.glb');

  useEffect(() => {
    if (gltf.scene) {
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.material) {
            child.material.emissive = new THREE.Color(0xffffff);
            child.material.emissiveIntensity = 2;
          }
        }
      });
    }
  }, [gltf.scene]);

  return (
    <primitive 
      object={gltf.scene} 
      scale={scale} 
      position={position} 
      rotation={rotation}
    />
  );
}

useGLTF.preload('../glb_file/lock.glb');
