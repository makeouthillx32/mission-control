/**
 * Office 3D — Agent Configuration
 *
 * Agents are now loaded dynamically from /api/office (which reads openclaw.json).
 * This file just exports the desk position grid and color palette used when
 * laying out however many agents your openclaw.json defines.
 */

export interface AgentConfig {
  id: string;
  name: string;
  emoji: string;
  position: [number, number, number];
  color: string;
  role: string;
}

export type AgentStatus = 'idle' | 'working' | 'thinking' | 'error';

export interface AgentState {
  id: string;
  status: AgentStatus;
  currentTask?: string;
  model?: string;
  tokensPerHour?: number;
  tasksInQueue?: number;
  uptime?: number;
}

/**
 * Desk positions for up to 12 agents.
 * Office3D.tsx picks position[i] for the i-th agent returned by /api/office.
 * Add more rows here if you ever have more than 12 agents.
 */
export const DESK_POSITIONS: [number, number, number][] = [
  [0,   0,  0],   // 0 — center front (main)
  [-4,  0, -3],   // 1
  [4,   0, -3],   // 2
  [-4,  0,  3],   // 3
  [4,   0,  3],   // 4
  [0,   0,  6],   // 5
  [-6,  0, -6],   // 6
  [6,   0, -6],   // 7
  [-6,  0,  6],   // 8
  [6,   0,  6],   // 9
  [0,   0, -6],   // 10
  [0,   0,  9],   // 11
];

/**
 * Fallback color palette — used if an agent has no color in openclaw.json.
 */
export const FALLBACK_COLORS = [
  '#FFCC00',
  '#4CAF50',
  '#E91E63',
  '#0077B5',
  '#9C27B0',
  '#607D8B',
  '#FF5722',
  '#00BCD4',
  '#8BC34A',
  '#FF9800',
  '#3F51B5',
  '#009688',
];