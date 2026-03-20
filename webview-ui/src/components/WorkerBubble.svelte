<!--
  King Agents — Worker Detail Bubble
  Shown when a worker is clicked. Warm office style card with info.
-->
<script lang="ts">
  import { gameStore } from '../stores/gameState.svelte';
  import { ROLE_INFO, STATUS_ICONS, STATUS_LABELS, ROLE_ROOM_MAP, ROOMS } from '../lib/constants';
  import { bridge } from '../lib/vscode-bridge';
  import type { AgentRole } from '../lib/types';

  let { role }: { role: AgentRole } = $props();

  let agent = $derived(gameStore.agents[role]);
  let info = $derived(ROLE_INFO[role]);
  let room = $derived(ROOMS[ROLE_ROOM_MAP[role]]);

  function formatTokens(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  }

  function tokenPercent(): number {
    return Math.round((agent.tokenUsed / Math.max(agent.tokenBudget, 1)) * 100);
  }

  function close() {
    gameStore.selectWorker(null);
  }

  function pause() {
    bridge.workerPause(role);
  }

  function retry() {
    bridge.workerRetry(role);
  }

  function copyOutput() {
    navigator.clipboard?.writeText(agent.output || '');
  }
</script>

<div class="bubble-overlay" role="button" tabindex="-1" onclick={close} onkeydown={(e) => e.key === 'Escape' && close()}>
  <div class="bubble" role="dialog" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
    <!-- Header -->
    <div class="bubble-header">
      <div class="bubble-icon" style="background-color: #{info.color.toString(16).padStart(6, '0')}">
        {info.icon}
      </div>
      <div class="bubble-title">
        <div class="bubble-name">{info.name}</div>
        <div class="bubble-subtitle">{info.title} | {room.label}</div>
      </div>
      <div class="bubble-status">
        {STATUS_ICONS[agent.status] || ''} {STATUS_LABELS[agent.status] || agent.status}
      </div>
      <button class="bubble-close" onclick={close}>{"✕"}</button>
    </div>

    <div class="bubble-divider"></div>

    <!-- Progress -->
    <div class="bubble-progress">
      <div class="progress-row">
        <span class="progress-label">进度</span>
        <div class="bar-container">
          <div class="bar-fill bar-progress" style="width: {agent.progress}%"></div>
        </div>
        <span class="progress-value">{agent.progress}%</span>
      </div>
      <div class="progress-row">
        <span class="progress-label">令牌</span>
        <div class="bar-container">
          <div class="bar-fill bar-token" style="width: {tokenPercent()}%"></div>
        </div>
        <span class="progress-value">{formatTokens(agent.tokenUsed)}/{formatTokens(agent.tokenBudget)}</span>
      </div>
    </div>

    <div class="bubble-divider"></div>

    <!-- Current task -->
    {#if agent.currentTask}
      <div class="bubble-task">
        <div class="task-label">当前任务</div>
        <div class="task-text">{agent.currentTask}</div>
      </div>
    {/if}

    <!-- Real-time output -->
    <div class="bubble-output">
      <div class="output-label">实时输出</div>
      <div class="output-scroll">
        <pre class="output-text">{agent.output || '// 等待输出...'}</pre>
      </div>
    </div>

    <div class="bubble-divider"></div>

    <!-- Action buttons -->
    <div class="bubble-actions">
      <button class="pixel-btn" onclick={pause}>
        暂停
      </button>
      <button class="pixel-btn" onclick={retry}>
        重试
      </button>
      <button class="pixel-btn" onclick={copyOutput}>
        复制
      </button>
    </div>
  </div>
</div>

<style>
  .bubble-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.3);
  }

  .bubble {
    background: rgba(62, 39, 35, 0.95);
    border: 3px solid #8B7355;
    border-radius: 6px;
    box-shadow:
      inset 0 0 0 1px #A08060,
      0 0 0 1px #3E2723,
      0 8px 32px rgba(0, 0, 0, 0.5);
    padding: 12px;
    min-width: 320px;
    max-width: 420px;
    max-height: 80vh;
    overflow-y: auto;
    image-rendering: pixelated;
    font-family: 'Press Start 2P', monospace;
  }

  .bubble-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .bubble-icon {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .bubble-title {
    flex: 1;
  }

  .bubble-name {
    font-size: var(--fs-sm);
    color: #FFF8F0;
  }

  .bubble-subtitle {
    font-size: var(--fs-xxs);
    color: #C9A882;
    margin-top: 2px;
  }

  .bubble-status {
    font-size: var(--fs-xs);
    color: #D4BA96;
  }

  .bubble-close {
    background: none;
    border: none;
    color: #8B7355;
    font-size: 14px;
    cursor: pointer;
    padding: 4px;
  }

  .bubble-close:hover {
    color: #FFF8F0;
  }

  .bubble-divider {
    height: 1px;
    background: #654321;
    margin: 8px 0;
  }

  .bubble-progress {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .progress-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .progress-label {
    font-size: var(--fs-xxs);
    color: #C9A882;
    width: 52px;
  }

  .bar-container {
    flex: 1;
    height: 8px;
    background: #3E2723;
    border: 1px solid #654321;
    border-radius: 2px;
  }

  .bar-fill {
    height: 100%;
    transition: width 0.3s;
    border-radius: 1px;
  }

  .bar-progress {
    background: linear-gradient(to right, #4caf50, #81c784);
  }

  .bar-token {
    background: linear-gradient(to right, #FFB74D, #FFD54F);
  }

  .progress-value {
    font-size: var(--fs-xxs);
    color: #D4BA96;
    min-width: 70px;
    text-align: right;
  }

  .bubble-task {
    margin-bottom: 8px;
  }

  .task-label {
    font-size: var(--fs-xs);
    color: #8B7355;
    margin-bottom: 4px;
  }

  .task-text {
    font-size: var(--fs-xs);
    color: #FFF8F0;
    line-height: 1.5;
  }

  .bubble-output {
    margin-bottom: 4px;
  }

  .output-label {
    font-size: var(--fs-xs);
    color: #8B7355;
    margin-bottom: 4px;
  }

  .output-scroll {
    background: #1a1208;
    border: 1px solid #654321;
    border-radius: 3px;
    max-height: 150px;
    overflow-y: auto;
    padding: 6px;
  }

  .output-text {
    font-size: var(--fs-xxs);
    font-family: 'Fira Code', 'Consolas', monospace;
    color: #4caf50;
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.6;
    margin: 0;
  }

  .bubble-actions {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .pixel-btn {
    font-family: 'Press Start 2P', monospace;
    font-size: var(--fs-xxs);
    padding: 8px 14px;
    border: 2px solid #8B7355;
    border-radius: 3px;
    background: #654321;
    color: #D4BA96;
    cursor: pointer;
    transition: all 0.1s;
  }

  .pixel-btn:hover {
    background: #8B6914;
    color: #FFF8F0;
    border-color: #C9A882;
  }

  .pixel-btn:active {
    transform: translateY(1px);
  }
</style>
