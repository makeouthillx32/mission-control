// src/components/Office3D/Office3D.tsx
'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Environment } from '@react-three/drei';
import { Suspense, useState, useEffect } from 'react';
import { Vector3 } from 'three';
import { DESK_POSITIONS, FALLBACK_COLORS } from './agentsConfig';
import type { AgentConfig } from './agentsConfig';
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
import { officeStore, useOfficeStore } from '@/components/Layouts/overlays/office/store';

interface OfficeAgent {
  id: string; name: string; emoji: string; color: string;
  role: string; currentTask: string; isActive: boolean;
}

// Suppress Three.js deprecation warnings globally — they fire every frame
// and flood the console with thousands of entries per second.
if (typeof window !== 'undefined') {
  const _warn = console.warn.bind(console);
  console.warn = (...args: any[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (
      msg.includes('PCFSoftShadowMap') ||
      msg.includes('THREE.Clock') ||
      msg.includes('Timer instead')
    ) return;
    _warn(...args);
  };
}

export default function Office3D() {
  const { controlMode, agents, agentStates, loading, selectedAgent } = useOfficeStore();
  const [avatarPositions, setAvatarPositions] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    officeStore.setActive(true);
    officeStore.setLoading(true);

    async function fetchOffice() {
      try {
        const res = await fetch('/api/office');
        if (!res.ok) throw new Error();
        const data = await res.json();
        const raw: OfficeAgent[] = data.agents || [];

        const configs: AgentConfig[] = raw.map((a, i) => ({
          id: a.id, name: a.name, emoji: a.emoji,
          color: a.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
          role: a.role,
          position: DESK_POSITIONS[i] ?? ([0, 0, i * 3] as [number, number, number]),
        }));

        const states: Record<string, any> = {};
        for (const a of raw) {
          states[a.id] = {
            id: a.id, status: a.isActive ? 'working' : 'idle',
            currentTask: a.currentTask, model: 'sonnet',
            tokensPerHour: 0, tasksInQueue: 0, uptime: 0,
          };
        }

        officeStore.setAgents(configs);
        officeStore.setAgentStates(states);
      } catch {
        // silent
      } finally {
        officeStore.setLoading(false);
      }
    }

    fetchOffice();
    const t = setInterval(fetchOffice, 30_000);

    return () => {
      clearInterval(t);
      officeStore.reset();
    };
  }, []);

  const getState = (id: string) => agentStates[id] ?? { id, status: 'idle' };

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
        // Don't pass `shadows` prop — it forces PCFSoftShadowMap and triggers
        // a deprecation warning on every single animation frame (1000+/sec).
        // Shadows are enabled selectively on lights/meshes via castShadow/receiveShadow.
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={
          <mesh><boxGeometry args={[2,2,2]} /><meshStandardMaterial color="orange" /></mesh>
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
              onClick={() => officeStore.setSelectedAgent(agent.id)}
              isSelected={selectedAgent === agent.id}
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

          <FileCabinet   position={[-8, 0,   -5]} onClick={() => officeStore.setInteractionModal('memory')} />
          <Whiteboard    position={[0,  0,   -8]} rotation={[0,0,0]} onClick={() => officeStore.setInteractionModal('roadmap')} />
          <CoffeeMachine position={[8,  0.8, -5]} onClick={() => officeStore.setInteractionModal('energy')} />
          <PlantPot position={[-7, 0, 6]} size="large" />
          <PlantPot position={[7,  0, 6]} size="medium" />
          <PlantPot position={[-9, 0, 0]} size="small" />
          <PlantPot position={[9,  0, 0]} size="small" />
          <WallClock position={[0, 2.5, -8.4]} rotation={[0,0,0]} />

          {controlMode === 'orbit' ? (
            <OrbitControls enableDamping dampingFactor={0.05} minDistance={5} maxDistance={30} maxPolarAngle={Math.PI / 2.2} />
          ) : (
            <FirstPersonControls moveSpeed={5} />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}