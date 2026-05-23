import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const paletteMap = {
  violet: {
    body: '#6d28d9',
    accent: '#22d3ee',
    skin: '#f7d0b6',
    hair: '#1e293b',
  },
  cyan: {
    body: '#0891b2',
    accent: '#7c3aed',
    skin: '#f3d4bc',
    hair: '#334155',
  },
  rose: {
    body: '#db2777',
    accent: '#2563eb',
    skin: '#f7d4bf',
    hair: '#0f172a',
  },
  mint: {
    body: '#0f766e',
    accent: '#7c3aed',
    skin: '#f6d8c2',
    hair: '#1f2937',
  },
  amber: {
    body: '#b45309',
    accent: '#2563eb',
    skin: '#f5cfb5',
    hair: '#111827',
  },
  sky: {
    body: '#1d4ed8',
    accent: '#ec4899',
    skin: '#f5d2bc',
    hair: '#1e293b',
  },
};

function Arm({ armRef, side = 'right', palette, pose }) {
  const x = side === 'right' ? 0.64 : -0.64;

  return (
    <group ref={armRef} position={[x, 0.92, 0]}>
      <mesh position={[0, -0.35, 0]}>
        <boxGeometry args={[0.24, 0.7, 0.24]} />
        <meshStandardMaterial color={palette.skin} roughness={0.48} />
      </mesh>
      <mesh position={[0, -0.72, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={palette.skin} roughness={0.45} />
      </mesh>
      {side === 'left' && pose !== 'point' && (
        <mesh position={[0.16, -0.48, 0.1]} rotation={[0.2, 0.2, 0.1]}>
          <boxGeometry args={[0.26, 0.34, 0.06]} />
          <meshStandardMaterial color={palette.accent} roughness={0.3} metalness={0.12} />
        </mesh>
      )}
    </group>
  );
}

function LegoTutor({ pose, cursor, palette, mini }) {
  const groupRef = useRef(null);
  const headRef = useRef(null);
  const rightArmRef = useRef(null);
  const leftArmRef = useRef(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (groupRef.current) {
      const floatAmp = pose === 'bounce' ? 0.12 : 0.07;
      const floatSpeed = pose === 'bounce' ? 4.8 : 2.1;
      groupRef.current.position.y = -0.26 + Math.sin(t * floatSpeed) * floatAmp;

      const idleRotate = Math.sin(t * 0.7) * 0.12;
      const targetY = cursor.x * 0.2 + idleRotate;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.08);
    }

    if (headRef.current) {
      let targetHeadY = THREE.MathUtils.clamp(cursor.x * 0.5, -0.35, 0.35);
      let targetHeadX = THREE.MathUtils.clamp(-cursor.y * 0.28, -0.24, 0.24);

      if (pose === 'point') {
        targetHeadY += 0.18;
      }

      if (pose === 'wave') {
        targetHeadX += 0.06;
      }

      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetHeadY, 0.1);
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, targetHeadX, 0.1);
    }

    if (rightArmRef.current) {
      let targetX = -0.25;
      let targetZ = 0;

      if (pose === 'wave') {
        targetX = -0.55;
        targetZ = 1.0 + Math.sin(t * 8) * 0.28;
      } else if (pose === 'point') {
        targetX = -1.2;
        targetZ = -0.6;
      } else if (pose === 'bounce') {
        targetX = -0.52;
      }

      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, targetX, 0.12);
      rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, targetZ, 0.12);
    }

    if (leftArmRef.current) {
      let targetX = -0.45 + Math.sin(t * 2) * 0.05;
      let targetZ = 0;

      if (pose === 'point') {
        targetX = -0.22;
        targetZ = 0.12;
      }

      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, targetX, 0.12);
      leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, targetZ, 0.12);
    }
  });

  return (
    <group ref={groupRef} scale={mini ? 0.86 : 1.12}>
      <mesh position={[0, -0.96, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.18, 40]} />
        <meshStandardMaterial color="#0f172a" transparent opacity={0.16} />
      </mesh>

      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.95, 1.04, 0.56]} />
        <meshStandardMaterial color={palette.body} roughness={0.45} metalness={0.1} />
      </mesh>

      <mesh position={[0, 0.72, 0.3]}>
        <boxGeometry args={[0.92, 0.36, 0.05]} />
        <meshStandardMaterial color={palette.accent} roughness={0.32} metalness={0.18} />
      </mesh>

      <group ref={headRef} position={[0, 1.38, 0]}>
        <mesh>
          <boxGeometry args={[0.74, 0.72, 0.68]} />
          <meshStandardMaterial color={palette.skin} roughness={0.45} />
        </mesh>

        <mesh position={[0, 0.44, 0]}>
          <boxGeometry args={[0.76, 0.18, 0.7]} />
          <meshStandardMaterial color={palette.hair} roughness={0.65} />
        </mesh>

        <mesh position={[-0.16, 0.08, 0.34]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        <mesh position={[0.16, 0.08, 0.34]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#111827" />
        </mesh>

        <mesh position={[0, -0.14, 0.35]}>
          <boxGeometry args={[0.2, 0.04, 0.04]} />
          <meshStandardMaterial color="#7f1d1d" />
        </mesh>
      </group>

      <Arm armRef={leftArmRef} side="left" pose={pose} palette={palette} />
      <Arm armRef={rightArmRef} side="right" pose={pose} palette={palette} />

      <mesh position={[-0.22, -0.34, 0]}>
        <boxGeometry args={[0.3, 0.68, 0.3]} />
        <meshStandardMaterial color="#1e293b" roughness={0.62} />
      </mesh>
      <mesh position={[0.22, -0.34, 0]}>
        <boxGeometry args={[0.3, 0.68, 0.3]} />
        <meshStandardMaterial color="#1e293b" roughness={0.62} />
      </mesh>

      <mesh position={[-0.22, -0.78, 0.02]}>
        <boxGeometry args={[0.34, 0.14, 0.44]} />
        <meshStandardMaterial color="#111827" roughness={0.7} />
      </mesh>
      <mesh position={[0.22, -0.78, 0.02]}>
        <boxGeometry args={[0.34, 0.14, 0.44]} />
        <meshStandardMaterial color="#111827" roughness={0.7} />
      </mesh>
    </group>
  );
}

function LegoTutorCanvas({
  className = '',
  pose = 'idle',
  cursor = { x: 0, y: 0 },
  variant = 'violet',
  mini = false,
}) {
  const palette = useMemo(() => paletteMap[variant] || paletteMap.violet, [variant]);

  return (
    <div className={className}>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        camera={{
          position: mini ? [0, 1.4, 3.2] : [0, 1.65, 3.6],
          fov: mini ? 44 : 40,
        }}
      >
        <ambientLight intensity={0.95} />
        <directionalLight position={[3, 4, 3]} intensity={1.2} />
        <directionalLight position={[-2, 2, -3]} intensity={0.45} color="#93c5fd" />
        <pointLight position={[0, 2, 2]} intensity={0.8} color="#a78bfa" />

        <LegoTutor pose={pose} cursor={cursor} palette={palette} mini={mini} />
      </Canvas>
    </div>
  );
}

export default LegoTutorCanvas;
