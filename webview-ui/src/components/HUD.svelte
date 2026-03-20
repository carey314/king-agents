<!--
  King Agents — HUD Overlay
  Top status bar + bottom worker panel (warm office style)
-->
<script lang="ts">
  import { gameStore } from '../stores/gameState.svelte';
  import { ROLE_INFO, STATUS_ICONS, STATUS_LABELS } from '../lib/constants';
  import type { AgentRole } from '../lib/types';

  const PHASE_LABELS: Record<string, string> = {
    idle: '空闲',
    working: '工作中',
    complete: '已完成',
  };

  // Format time as MM:SS
  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // Format token count
  function formatTokens(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  }

  function selectWorker(role: AgentRole) {
    if (gameStore.selectedWorker === role) {
      gameStore.selectWorker(null);
    } else {
      gameStore.selectWorker(role);
    }
  }

  function toggleView() {
    gameStore.activeView = gameStore.activeView === 'map' ? 'data' : 'map';
  }

  const roles: AgentRole[] = ['router', 'coder', 'guardian', 'builder', 'scout'];
</script>

<!-- Top Status Bar -->
<div class="hud-top">
  <div class="hud-top-inner">
    {#if gameStore.currentTask}
      <span class="hud-task" title={gameStore.currentTask}>
        <span class="hud-icon">{"\u{1F4CB}"}</span>
        <span class="task-text">{gameStore.currentTask}</span>
      </span>
      <span class="hud-divider">|</span>
    {/if}
    <span class="hud-item">
      <span class="hud-icon">{"\u{23F1}\u{FE0F}"}</span>
      <span>{formatTime(gameStore.time)}</span>
    </span>
    <span class="hud-divider">|</span>
    <span class="hud-item">
      <span class="hud-icon">{"\u{1F4CA}"}</span>
      <span>{gameStore.overallProgress}%</span>
    </span>
    <span class="hud-divider">|</span>
    <span class="hud-item">
      <span class="hud-icon">{"\u{1F4B0}"}</span>
      <span>{formatTokens(gameStore.totalTokens)} 令牌消耗</span>
    </span>
    <span class="hud-divider">|</span>
    <span class="hud-item">
      <span class="hud-icon">{"\u{1F465}"}</span>
      <span>{gameStore.workingCount} 工作中</span>
    </span>
    <span class="hud-divider">|</span>
    <span class="hud-phase">{PHASE_LABELS[gameStore.phase] || gameStore.phase}</span>
  </div>
</div>

<!-- Bottom Worker Panel -->
<div class="hud-bottom">
  <div class="worker-panel">
    {#each roles as role}
      {@const agent = gameStore.agents[role]}
      {@const info = ROLE_INFO[role]}
      <button
        class="worker-card"
        class:selected={gameStore.selectedWorker === role}
        class:working={agent.status === 'working'}
        class:blocked={agent.status === 'blocked'}
        class:done={agent.status === 'done'}
        onclick={() => selectWorker(role)}
      >
        <div class="worker-icon" style="background-color: #{info.color.toString(16).padStart(6, '0')}">
          <span class="worker-emoji">{info.icon}</span>
        </div>
        <div class="worker-info">
          <div class="worker-name">{info.name}</div>
          <div class="worker-title">{info.title}</div>
          <div class="worker-bars">
            <div class="mini-bar">
              <div
                class="mini-bar-fill progress"
                style="width: {agent.progress}%"
              ></div>
            </div>
          </div>
          <div class="worker-status">
            {STATUS_ICONS[agent.status] || ''} {STATUS_LABELS[agent.status] || agent.status}
          </div>
        </div>
      </button>
    {/each}

    <!-- Data panel toggle -->
    <button class="data-toggle" onclick={toggleView}>
      <span>{gameStore.activeView === 'map' ? '\u{1F4CA}' : '\u{1F3E2}'}</span>
      <span class="toggle-label">{gameStore.activeView === 'map' ? '数据' : '办公室'}</span>
    </button>
  </div>
</div>

<style>
  .hud-top {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
    pointer-events: none;
    display: flex;
    justify-content: center;
    padding: 8px;
  }

  .hud-top-inner {
    pointer-events: auto;
    background: var(--ka-panel);
    border: 2px solid var(--ka-border);
    border-top: none;
    border-radius: 0 0 6px 6px;
    padding: 8px 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'Press Start 2P', monospace;
    font-size: var(--fs-xs);
    color: #D4BA96;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .hud-task {
    display: flex;
    align-items: center;
    gap: 6px;
    max-width: 280px;
  }

  .task-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #FFD54F;
    font-size: var(--fs-xs);
  }

  .hud-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .hud-icon {
    font-size: var(--fs-icon);
  }

  .hud-divider {
    color: #654321;
    margin: 0 3px;
  }

  .hud-phase {
    color: #4caf50;
    font-size: var(--fs-xs);
  }

  .hud-bottom {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 50;
    pointer-events: none;
    display: flex;
    justify-content: center;
    padding: 8px;
  }

  .worker-panel {
    pointer-events: auto;
    background: rgba(62, 39, 35, 0.88);
    border: 2px solid #8B7355;
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    padding: 8px 12px;
    display: flex;
    align-items: stretch;
    gap: 8px;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.3);
  }

  .worker-card {
    background: rgba(101, 67, 33, 0.6);
    border: 2px solid #8B6914;
    border-radius: 4px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    transition: all 0.15s;
    min-width: 90px;
    font-family: 'Press Start 2P', monospace;
  }

  .worker-card:hover {
    border-color: #C9A882;
    background: rgba(139, 105, 20, 0.5);
  }

  .worker-card.selected {
    border-color: #FFD54F;
    background: rgba(139, 105, 20, 0.5);
    box-shadow: 0 0 8px rgba(255, 213, 79, 0.3);
  }

  .worker-card.working {
    border-color: #4caf50;
  }

  .worker-card.blocked {
    border-color: #e53935;
  }

  .worker-card.done {
    border-color: #8B7355;
  }

  .worker-icon {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .worker-emoji {
    font-size: var(--fs-icon);
  }

  .worker-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    width: 100%;
  }

  .worker-name {
    font-size: var(--fs-xs);
    color: #FFF8F0;
  }

  .worker-title {
    font-size: var(--fs-xxs);
    color: #C9A882;
  }

  .worker-bars {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin-top: 2px;
  }

  .mini-bar {
    width: 100%;
    height: 4px;
    background: #3E2723;
    border: 1px solid #654321;
    border-radius: 1px;
  }

  .mini-bar-fill {
    height: 100%;
    transition: width 0.3s;
    border-radius: 1px;
  }

  .mini-bar-fill.progress {
    background: linear-gradient(to right, #4caf50, #81c784);
  }

  .worker-status {
    font-size: var(--fs-xxs);
    color: #C9A882;
    margin-top: 2px;
  }

  .data-toggle {
    background: rgba(101, 67, 33, 0.6);
    border: 2px solid #8B6914;
    border-radius: 4px;
    padding: 6px 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'Press Start 2P', monospace;
    min-width: 50px;
  }

  .data-toggle:hover {
    border-color: #C9A882;
    background: rgba(139, 105, 20, 0.5);
  }

  .data-toggle span:first-child {
    font-size: var(--fs-icon);
  }

  .toggle-label {
    font-size: var(--fs-xxs);
    color: #C9A882;
  }
</style>
