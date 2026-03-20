// ============================================================
// King Agents — Shared Type Definitions
// ============================================================

export type AgentRole = 'router' | 'coder' | 'guardian' | 'builder' | 'scout';

export type AgentStatus =
  | 'idle'
  | 'working'
  | 'waiting'
  | 'blocked'
  | 'done';

export type RoomId =
  | 'meeting'
  | 'coderoom'
  | 'testlab'
  | 'deploybay'
  | 'library'
  | 'lounge';

export interface Position {
  x: number;
  y: number;
}

export interface AgentState {
  role: AgentRole;
  status: AgentStatus;
  currentTask: string | null;
  progress: number;        // 0-100
  tokenUsed: number;
  tokenBudget: number;
  output: string;
  startTime: number | null;
  error: string | null;
}

export interface FileTransfer {
  id: string;
  from: AgentRole;
  to: AgentRole;
  label: string;
  timestamp: number;
}

export interface GameEvent {
  id: string;
  type: 'task_start' | 'task_done' | 'code_submit' | 'review_pass' | 'review_fail' | 'build_success' | 'build_fail' | 'search_done' | 'victory' | 'info';
  message: string;
  timestamp: number;
}

export interface SessionStats {
  mvp: AgentRole;
  duration: number;
  totalTokens: number;
  contributions: Record<AgentRole, { tokens: number; tasks: number }>;
}

export interface GameState {
  matchId: number;
  time: number;
  agents: Record<AgentRole, AgentState>;
  totalTokens: number;
  tokenBudget: number;
  phase: 'idle' | 'working' | 'complete';
  events: GameEvent[];
  fileTransfers: FileTransfer[];
  currentTask: string | null;
}

// VS Code bridge message types
export type ExtensionMessage =
  | { type: 'agent:stateUpdate'; role: AgentRole; state: Partial<AgentState> }
  | { type: 'agent:output'; role: AgentRole; text: string }
  | { type: 'game:event'; event: GameEvent }
  | { type: 'game:fileTransfer'; transfer: FileTransfer }
  | { type: 'game:victory'; stats: SessionStats }
  | { type: 'game:start'; matchId: number; task?: string }
  | { type: 'game:reset' };

export type WebviewMessage =
  | { type: 'worker:click'; role: AgentRole }
  | { type: 'worker:pause'; role: AgentRole }
  | { type: 'worker:retry'; role: AgentRole }
  | { type: 'ui:ready' }
  | { type: 'ui:requestState' };
