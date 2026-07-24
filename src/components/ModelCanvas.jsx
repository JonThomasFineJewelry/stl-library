import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Bounds } from '@react-three/drei';

function Model({ geometry }) {
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#d4af6a" metalness={0.6} roughness={0.35} />
    </mesh>
  );
}

export default function ModelCanvas({ geometry, zoomable = false, dpr = [1, 1.5] }) {
  return (
    <Canvas dpr={dpr} camera={{ position: [0, 0, 100], fov: 45 }} gl={{ antialias: true }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} />
      <directionalLight position={[-5, -3, -5]} intensity={0.35} />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.3}>
          <Model geometry={geometry} />
        </Bounds>
      </Suspense>
      <OrbitControls enablePan={false} enableZoom={zoomable} enableRotate makeDefault />
    </Canvas>
  );
}
