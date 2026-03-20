// src/components/Office3D/Office3D.tsx
'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Environment } from '@react-three/drei';
import { Suspense, useState } from 'react';
import { Vector3 } from 'three';
import AgentDesk from './AgentDesk';
import Floor from './Floor';
import Walls from './Walls';
import Lights from './Lights';
import FileCabinet from './FileCabinet';
import Whiteboard from './Whiteboard';
import CoffeeMachine from './CoffeeMachine';
import PlantPot from './PlantPot';
import WallClock from './WallClock';
import FirstPersonControls from './FirstPersonControls';
import MovingAvatar from './MovingAvatar';
import { useOfficeContext } from '@/components/Layouts/overlays/office';

export default function Office3D() {
  const ctx = useOfficeContext();

  // Should never be null here since office/page.tsx wraps in OfficeProvider,
  // but guard defensively so prerender doesn't crash.
  const controlMode        = ctx?.controlMode ?? 'orbit';
  const agents             = ctx?.agents ?? [];
  const loading            = ctx?.loading ?? true;
  const getState           = ctx?.getState ?? ((id: string) => ({ id, status: 'idle' as const }));
  const setSelectedAgent   = ctx?.setSelectedAgent ?? (() => {});
  const setInteractionModal = ctx?.setInteractionModal ?? (() => {});

  const [avatarPositions, setAvatarPositions] = useState<Map<string, any>>(new Map());

  const obstacles = [
    ...agents.map(a => ({ position: new Vector3(a.position[0], 0, a.position[2]), radius: 1.5 })),
    { position: new Vector3(-8, 0, -5), radius: 0.8 },
    { position: new Vector3(0,  0, -8), radius: 1.5 },
    { position: new Vector3(8,  0, -5), radius: 0.6 },
    { position: new Vector3(-7, 0,  6), radius: 0.5 },
    { position: new Vector3(7,  0,  6), radius: 0.5 },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#111827' }}>
      <Canvas
        camera={{ position: [0, 8, 12], fov: 60 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={
          <mesh>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="orange" />
          </mesh>
        }>
          <Lights />
          <Sky sunPosition={[100, 20, 100]} />
          <Environment preset="sunset" />
          <Floor />
          <Walls />

          {!loading && agents.map(agent => (
            <AgentDesk
              key={agent.id}
              agent={agent}
              state={getState(agent.id)}
              onClick={() => setSelectedAgent(agent.id)}
              isSelected={false}
            />
          ))}

          {!loading && agents.map(agent => (
            <MovingAvatar
              key={`avatar-${agent.id}`}
              agent={agent}
              state={getState(agent.id)}
              officeBounds={{ minX: -8, maxX: 8, minZ: -7, maxZ: 7 }}
              obstacles={obstacles}
              otherAvatarPositions={avatarPositions}
              onPositionUpdate={(id, pos) =>
                setAvatarPositions(prev => new Map(prev).set(id, pos))
              }
            />
          ))}

          <FileCabinet   position={[-8, 0,   -5]} onClick={() => setInteractionModal('memory')} />
          <Whiteboard    position={[0,  0,   -8]} rotation={[0, 0, 0]} onClick={() => setInteractionModal('roadmap')} />
          <CoffeeMachine position={[8,  0.8, -5]} onClick={() => setInteractionModal('energy')} />
          <PlantPot position={[-7, 0, 6]} size="large" />
          <PlantPot position={[7,  0, 6]} size="medium" />
          <PlantPot position={[-9, 0, 0]} size="small" />
          <PlantPot position={[9,  0, 0]} size="small" />
          <WallClock position={[0, 2.5, -8.4]} rotation={[0, 0, 0]} />

          {controlMode === 'orbit' ? (
            <OrbitControls
              enableDamping
              dampingFactor={0.05}
              minDistance={5}
              maxDistance={30}
              maxPolarAngle={Math.PI / 2.2}
            />
          ) : (
            <FirstPersonControls moveSpeed={5} />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}