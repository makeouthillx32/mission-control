'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Environment } from '@react-three/drei';
import { Suspense, useState, useEffect } from 'react';
import { Vector3 } from 'three';
import type { AgentConfig, AgentState } from './agentsConfig';
import { DESK_POSITIONS, FALLBACK_COLORS } from './agentsConfig';
import AgentDesk from './AgentDesk';
import Floor from './Floor';
import Walls from './Walls';
import Lights from './Lights';
import AgentPanel from './AgentPanel';
import FileCabinet from './FileCabinet';
import Whiteboard from './Whiteboard';
import CoffeeMachine from './CoffeeMachine';
import PlantPot from './PlantPot';
import WallClock from './WallClock';
import FirstPersonControls from './FirstPersonControls';
import MovingAvatar from './MovingAvatar';

// Shape of what /api/office returns per agent
interface OfficeAgent {
  id: string;
  name: string;
  emoji: string;
  color: string;
  role: string;
  currentTask: string;
  isActive: boolean;
}

export default function Office3D() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [interactionModal, setInteractionModal] = useState<string | null>(null);
  const [controlMode, setControlMode] = useState<'orbit' | 'fps'>('orbit');
  const [avatarPositions, setAvatarPositions] = useState<Map<string, any>>(new Map());

  // Real agent data from /api/office
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOffice() {
      try {
        const res = await fetch('/api/office');
        if (!res.ok) throw new Error('Failed to fetch office data');
        const data = await res.json();
        const officeAgents: OfficeAgent[] = data.agents || [];

        // Map API agents → AgentConfig with positions
        const configs: AgentConfig[] = officeAgents.map((a, i) => ({
          id: a.id,
          name: a.name,
          emoji: a.emoji,
          color: a.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
          role: a.role,
          position: DESK_POSITIONS[i] ?? [0, 0, i * 3] as [number, number, number],
        }));

        // Map API agents → AgentState
        const states: Record<string, AgentState> = {};
        for (const a of officeAgents) {
          states[a.id] = {
            id: a.id,
            status: a.isActive ? 'working' : 'idle',
            currentTask: a.currentTask,
            model: 'sonnet',
            tokensPerHour: 0,
            tasksInQueue: 0,
            uptime: 0,
          };
        }

        setAgents(configs);
        setAgentStates(states);
      } catch (err) {
        console.warn('[Office3D] Could not load office data:', err);
        // Leave empty — desks won't render, no crash
      } finally {
        setLoading(false);
      }
    }

    fetchOffice();
    // Refresh every 30s
    const interval = setInterval(fetchOffice, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleDeskClick = (agentId: string) => setSelectedAgent(agentId);
  const handleClosePanel = () => setSelectedAgent(null);
  const handleFileCabinetClick = () => setInteractionModal('memory');
  const handleWhiteboardClick = () => setInteractionModal('roadmap');
  const handleCoffeeClick = () => setInteractionModal('energy');
  const handleCloseModal = () => setInteractionModal(null);

  const handleAvatarPositionUpdate = (id: string, position: any) => {
    setAvatarPositions(prev => new Map(prev).set(id, position));
  };

  const obstacles = [
    ...agents.map(agent => ({
      position: new Vector3(agent.position[0], 0, agent.position[2]),
      radius: 1.5,
    })),
    { position: new Vector3(-8, 0, -5), radius: 0.8 },
    { position: new Vector3(0, 0, -8), radius: 1.5 },
    { position: new Vector3(8, 0, -5), radius: 0.6 },
    { position: new Vector3(-7, 0, 6), radius: 0.5 },
    { position: new Vector3(7, 0, 6), radius: 0.5 },
  ];

  // Safe state lookup — always returns a valid AgentState
  const getState = (agentId: string): AgentState =>
    agentStates[agentId] ?? { id: agentId, status: 'idle' };

  return (
    <div className="fixed inset-0 bg-gray-900" style={{ height: '100vh', width: '100vw' }}>
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

          {!loading && agents.map((agent) => (
            <AgentDesk
              key={agent.id}
              agent={agent}
              state={getState(agent.id)}
              onClick={() => handleDeskClick(agent.id)}
              isSelected={selectedAgent === agent.id}
            />
          ))}

          {!loading && agents.map((agent) => (
            <MovingAvatar
              key={`avatar-${agent.id}`}
              agent={agent}
              state={getState(agent.id)}
              officeBounds={{ minX: -8, maxX: 8, minZ: -7, maxZ: 7 }}
              obstacles={obstacles}
              otherAvatarPositions={avatarPositions}
              onPositionUpdate={handleAvatarPositionUpdate}
            />
          ))}

          <FileCabinet position={[-8, 0, -5]} onClick={handleFileCabinetClick} />
          <Whiteboard position={[0, 0, -8]} rotation={[0, 0, 0]} onClick={handleWhiteboardClick} />
          <CoffeeMachine position={[8, 0.8, -5]} onClick={handleCoffeeClick} />
          <PlantPot position={[-7, 0, 6]} size="large" />
          <PlantPot position={[7, 0, 6]} size="medium" />
          <PlantPot position={[-9, 0, 0]} size="small" />
          <PlantPot position={[9, 0, 0]} size="small" />
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

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-white">
          <div className="text-center">
            <div className="text-4xl mb-3 animate-pulse">🏢</div>
            <p className="text-lg font-medium">Loading agents...</p>
          </div>
        </div>
      )}

      {/* Agent panel */}
      {selectedAgent && (() => {
        const agent = agents.find(a => a.id === selectedAgent);
        if (!agent) return null;
        return (
          <AgentPanel
            agent={agent}
            state={getState(selectedAgent)}
            onClose={handleClosePanel}
          />
        );
      })()}

      {/* Interaction modal */}
      {interactionModal && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-yellow-500 rounded-lg p-8 max-w-2xl w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-yellow-400">
                {interactionModal === 'memory' && '📁 Memory Browser'}
                {interactionModal === 'roadmap' && '📋 Roadmap & Planning'}
                {interactionModal === 'energy' && '☕ Agent Energy Dashboard'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-white text-3xl leading-none">×</button>
            </div>
            <div className="text-gray-300 space-y-4">
              {interactionModal === 'memory' && (
                <>
                  <p className="text-lg">🧠 Access to workspace memories and files</p>
                  <div className="bg-gray-800 p-4 rounded border border-gray-700">
                    <p className="text-sm text-gray-400 mb-2">Quick links:</p>
                    <ul className="space-y-2">
                      <li><a href="/memory" className="text-yellow-400 hover:underline">→ Full Memory Browser</a></li>
                      <li><a href="/files" className="text-yellow-400 hover:underline">→ File Explorer</a></li>
                    </ul>
                  </div>
                </>
              )}
              {interactionModal === 'roadmap' && (
                <>
                  <p className="text-lg">📋 Project roadmap and planning</p>
                  <div className="bg-gray-800 p-4 rounded border border-gray-700">
                    <ul className="space-y-2">
                      <li><a href="/cron" className="text-yellow-400 hover:underline">→ Cron Job Manager</a></li>
                      <li><a href="/activity" className="text-yellow-400 hover:underline">→ Activity Feed</a></li>
                    </ul>
                  </div>
                </>
              )}
              {interactionModal === 'energy' && (
                <>
                  <p className="text-lg">⚡ Agent activity and energy levels</p>
                  <div className="bg-gray-800 p-4 rounded border border-gray-700 space-y-3">
                    <div>
                      <p className="text-sm text-gray-400">Active agents:</p>
                      <p className="text-2xl font-bold text-green-400">
                        {Object.values(agentStates).filter(s => s.status === 'working').length} / {agents.length}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 italic">Live data from OpenClaw gateway</p>
                </>
              )}
            </div>
            <button onClick={handleCloseModal} className="mt-6 w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute top-4 left-4 bg-black/70 text-white p-4 rounded-lg backdrop-blur-sm">
        <h2 className="text-lg font-bold mb-2">🏢 The Office</h2>
        <div className="text-sm space-y-1 mb-3">
          <p><strong>Mode: {controlMode === 'orbit' ? '🖱️ Orbit' : '🎮 FPS'}</strong></p>
          {controlMode === 'orbit' ? (
            <>
              <p>🖱️ Drag: Rotate</p>
              <p>🔄 Scroll: Zoom</p>
              <p>👆 Click desk: Agent info</p>
            </>
          ) : (
            <>
              <p>Click to lock cursor</p>
              <p>WASD: Move | Mouse: Look</p>
              <p>ESC: Unlock</p>
            </>
          )}
        </div>
        <div className="text-xs text-gray-400 mb-2">
          {agents.length} agents · {Object.values(agentStates).filter(s => s.status === 'working').length} active
        </div>
        <button
          onClick={() => setControlMode(controlMode === 'orbit' ? 'fps' : 'orbit')}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-3 rounded text-xs transition-colors"
        >
          Switch to {controlMode === 'orbit' ? '🎮 FPS' : '🖱️ Orbit'}
        </button>
      </div>
    </div>
  );
}