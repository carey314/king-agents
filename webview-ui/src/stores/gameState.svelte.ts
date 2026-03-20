// ============================================================
// King Agents — Svelte 5 Reactive Game State Store
// ============================================================
// Pixel Office Studio edition. No MOBA fields (towers, KDA).

import type {
  AgentRole,
  AgentState,
  AgentStatus,
  FileTransfer,
  GameEvent,
  GameState,
  SessionStats,
} from '../lib/types';
import { bridge } from '../lib/vscode-bridge';

// ---- Default agent state factory ----
function createDefaultAgent(role: AgentRole): AgentState {
  return {
    role,
    status: 'idle',
    currentTask: null,
    progress: 0,
    tokenUsed: 0,
    tokenBudget: 10000,
    output: '',
    startTime: null,
    error: null,
  };
}

// ---- Reactive state using Svelte 5 $state ----
class GameStore {
  // Core game state
  matchId = $state(0);
  time = $state(0);
  phase = $state<GameState['phase']>('idle');
  totalTokens = $state(0);
  tokenBudget = $state(10000);
  currentTask = $state<string | null>(null);

  // Agents
  agents = $state<Record<AgentRole, AgentState>>({
    router: createDefaultAgent('router'),
    coder: createDefaultAgent('coder'),
    guardian: createDefaultAgent('guardian'),
    builder: createDefaultAgent('builder'),
    scout: createDefaultAgent('scout'),
  });

  // File transfers (inter-agent communication log)
  fileTransfers = $state<FileTransfer[]>([]);

  // Events
  events = $state<GameEvent[]>([]);

  // UI state
  selectedWorker = $state<AgentRole | null>(null);
  showCompletionScreen = $state(false);
  completionStats = $state<SessionStats | null>(null);
  activeView = $state<'map' | 'data'>('map');

  // Timer
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Derived values
  get agentList(): AgentState[] {
    return [
      this.agents.router,
      this.agents.coder,
      this.agents.guardian,
      this.agents.builder,
      this.agents.scout,
    ];
  }

  get workingCount(): number {
    return this.agentList.filter(a => a.status === 'working').length;
  }

  get doneCount(): number {
    return this.agentList.filter(a => a.status === 'done').length;
  }

  get overallProgress(): number {
    const total = this.agentList.reduce((sum, a) => sum + a.progress, 0);
    return Math.round(total / 5);
  }

  // ---- Actions ----

  updateAgent(role: AgentRole, patch: Partial<AgentState>): void {
    const agent = this.agents[role];
    Object.assign(agent, patch);

    // Recalculate total tokens
    this.totalTokens = Object.values(this.agents).reduce(
      (sum, a) => sum + a.tokenUsed,
      0,
    );
  }

  updateAgentStatus(role: AgentRole, status: AgentStatus): void {
    this.agents[role].status = status;
  }

  appendAgentOutput(role: AgentRole, text: string): void {
    this.agents[role].output += text;
  }

  addFileTransfer(transfer: FileTransfer): void {
    this.fileTransfers = [transfer, ...this.fileTransfers].slice(0, 30);
  }

  addEvent(event: GameEvent): void {
    this.events = [event, ...this.events].slice(0, 50);
  }

  selectWorker(role: AgentRole | null): void {
    this.selectedWorker = role;
  }

  startMatch(matchId: number, task?: string): void {
    this.matchId = matchId;
    this.time = 0;
    this.phase = 'idle';
    this.totalTokens = 0;
    this.events = [];
    this.fileTransfers = [];
    this.showCompletionScreen = false;
    this.completionStats = null;
    this.currentTask = task || null;

    // Reset agents
    for (const role of Object.keys(this.agents) as AgentRole[]) {
      this.agents[role] = createDefaultAgent(role);
    }

    // Start timer
    this.startTimer();
  }

  setPhase(phase: GameState['phase']): void {
    this.phase = phase;
  }

  endMatch(stats: SessionStats | null): void {
    this.phase = 'complete';
    this.completionStats = stats;
    this.showCompletionScreen = true;
    this.stopTimer();
  }

  reset(): void {
    this.stopTimer();
    this.matchId = 0;
    this.time = 0;
    this.phase = 'idle';
    this.totalTokens = 0;
    this.events = [];
    this.fileTransfers = [];
    this.showCompletionScreen = false;
    this.completionStats = null;
    this.selectedWorker = null;
    this.currentTask = null;

    for (const role of Object.keys(this.agents) as AgentRole[]) {
      this.agents[role] = createDefaultAgent(role);
    }
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.time++;
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ---- VS Code Bridge integration ----
  initBridge(): void {
    bridge.onMessage((msg) => {
      switch (msg.type) {
        case 'agent:stateUpdate':
          this.updateAgent(msg.role, msg.state);
          break;

        case 'agent:output':
          this.appendAgentOutput(msg.role, msg.text);
          break;

        case 'game:event':
          this.addEvent(msg.event);
          break;

        case 'game:fileTransfer':
          this.addFileTransfer(msg.transfer);
          break;

        case 'game:victory':
          this.endMatch(msg.stats);
          break;

        case 'game:start':
          this.startMatch(msg.matchId, msg.task);
          break;

        case 'game:reset':
          this.reset();
          break;
      }
    });

    bridge.notifyReady();
  }
}

// Singleton store instance
export const gameStore = new GameStore();
