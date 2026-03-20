<!--
  King Agents — Data Panel
  Token economy bar chart, timeline, agent activity log
  Warm office style with Chinese text.
-->
<script lang="ts">
  import { gameStore } from '../stores/gameState.svelte';
  import { ROLE_INFO, STATUS_LABELS } from '../lib/constants';
  import type { AgentRole } from '../lib/types';

  const PHASE_LABELS: Record<string, string> = {
    idle: '空闲',
    working: '工作中',
    complete: '已完成',
  };

  const roles: AgentRole[] = ['router', 'coder', 'guardian', 'builder', 'scout'];

  function formatTokens(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function tokenPercent(role: AgentRole): number {
    const total = gameStore.totalTokens || 1;
    return (gameStore.agents[role].tokenUsed / total) * 100;
  }

  function tokenOfBudget(role: AgentRole): number {
    const budget = gameStore.agents[role].tokenBudget || 1;
    return (gameStore.agents[role].tokenUsed / budget) * 100;
  }

  function close() {
    gameStore.activeView = 'map';
  }
</script>

<div class="data-panel">
  <div class="panel-header">
    <span class="panel-title">{"\u{1F4CA}"} 项目统计</span>
    <button class="panel-close" onclick={close}>{"✕"}</button>
  </div>

  <!-- Token Economy -->
  <div class="section">
    <div class="section-title">令牌消耗</div>
    <div class="token-chart">
      {#each roles as role}
        {@const agent = gameStore.agents[role]}
        {@const info = ROLE_INFO[role]}
        <div class="token-row">
          <span class="token-icon">{info.icon}</span>
          <span class="token-name">{info.name}</span>
          <div class="token-bar-bg">
            <div
              class="token-bar-fill"
              style="width: {tokenOfBudget(role)}%; background-color: #{info.color.toString(16).padStart(6, '0')}"
            ></div>
          </div>
          <span class="token-value">{formatTokens(agent.tokenUsed)}</span>
          <span class="token-pct">({gameStore.totalTokens > 0 ? Math.round(tokenPercent(role)) : 0}%)</span>
        </div>
      {/each}
      <div class="token-total">
        总计: {formatTokens(gameStore.totalTokens)} / {formatTokens(gameStore.tokenBudget)}
      </div>
    </div>
  </div>

  <!-- Agent Status -->
  <div class="section">
    <div class="section-title">成员状态</div>
    <div class="status-grid">
      {#each roles as role}
        {@const agent = gameStore.agents[role]}
        {@const info = ROLE_INFO[role]}
        <div class="status-row">
          <span class="status-icon">{info.icon}</span>
          <span class="status-name">{info.name}</span>
          <span class="status-role">{info.title}</span>
          <div class="status-bar-container">
            <div
              class="status-bar-fill"
              style="width: {agent.progress}%; background-color: #{info.color.toString(16).padStart(6, '0')}"
            ></div>
          </div>
          <span class="status-pct">{agent.progress}%</span>
          <span class="status-state" class:working={agent.status === 'working'} class:blocked={agent.status === 'blocked'} class:done={agent.status === 'done'}>
            {STATUS_LABELS[agent.status] || agent.status}
          </span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Recent Events -->
  <div class="section">
    <div class="section-title">活动日志</div>
    <div class="event-log">
      {#each gameStore.events.slice(0, 10) as event}
        <div class="event-row">
          <span class="event-time">{formatTime(Math.floor((event.timestamp - (gameStore.agents.router.startTime || Date.now())) / 1000))}</span>
          <span class="event-msg">{event.message}</span>
        </div>
      {/each}
      {#if gameStore.events.length === 0}
        <div class="event-empty">暂无事件...</div>
      {/if}
    </div>
  </div>

  <!-- Summary -->
  <div class="section">
    <div class="section-title">概览</div>
    <div class="summary-grid">
      <div class="summary-item">
        <span class="summary-label">耗时</span>
        <span class="summary-value">{formatTime(gameStore.time)}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">阶段</span>
        <span class="summary-value">{PHASE_LABELS[gameStore.phase] || gameStore.phase}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">进度</span>
        <span class="summary-value">{gameStore.overallProgress}%</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">在岗</span>
        <span class="summary-value">{gameStore.workingCount}/5</span>
      </div>
    </div>
  </div>
</div>

<style>
  .data-panel {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 70;
    background: rgba(62, 39, 35, 0.95);
    border: 3px solid #8B7355;
    border-radius: 6px;
    box-shadow:
      inset 0 0 0 1px #A08060,
      0 0 0 1px #3E2723,
      0 8px 32px rgba(0, 0, 0, 0.5);
    padding: 16px;
    min-width: 420px;
    max-width: 520px;
    max-height: 80vh;
    overflow-y: auto;
    font-family: 'Press Start 2P', monospace;
    image-rendering: pixelated;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .panel-title {
    font-size: var(--fs-sm);
    color: #FFF8F0;
  }

  .panel-close {
    background: none;
    border: none;
    color: #8B7355;
    font-size: var(--fs-lg);
    cursor: pointer;
    padding: 4px;
  }

  .panel-close:hover {
    color: #FFF8F0;
  }

  .section {
    margin-bottom: 16px;
  }

  .section-title {
    font-size: var(--fs-xs);
    color: #4caf50;
    margin-bottom: 8px;
    border-bottom: 1px solid #654321;
    padding-bottom: 4px;
  }

  /* Token chart */
  .token-chart {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .token-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .token-icon {
    font-size: var(--fs-icon);
    width: 22px;
    text-align: center;
  }

  .token-name {
    font-size: var(--fs-xxs);
    color: #D4BA96;
    width: 52px;
  }

  .token-bar-bg {
    flex: 1;
    height: 8px;
    background: #3E2723;
    border: 1px solid #654321;
    border-radius: 2px;
  }

  .token-bar-fill {
    height: 100%;
    transition: width 0.3s;
    border-radius: 1px;
  }

  .token-value {
    font-size: var(--fs-xxs);
    color: #FFF8F0;
    min-width: 40px;
    text-align: right;
  }

  .token-pct {
    font-size: var(--fs-xxs);
    color: #8B7355;
    min-width: 30px;
  }

  .token-total {
    font-size: var(--fs-xxs);
    color: #C9A882;
    text-align: right;
    margin-top: 4px;
    padding-top: 4px;
    border-top: 1px solid #3E2723;
  }

  /* Status grid */
  .status-grid {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .status-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 0;
  }

  .status-icon { font-size: var(--fs-icon); width: 22px; text-align: center; }
  .status-name { font-size: var(--fs-xxs); color: #FFF8F0; width: 48px; }
  .status-role { font-size: var(--fs-xxs); color: #C9A882; width: 68px; }

  .status-bar-container {
    flex: 1;
    height: 8px;
    background: #3E2723;
    border: 1px solid #654321;
    border-radius: 2px;
  }

  .status-bar-fill {
    height: 100%;
    transition: width 0.3s;
    border-radius: 1px;
  }

  .status-pct { font-size: var(--fs-xxs); color: #D4BA96; min-width: 32px; text-align: right; }

  .status-state {
    font-size: var(--fs-xxs);
    color: #C9A882;
    min-width: 54px;
    text-align: center;
  }
  .status-state.working { color: #4caf50; }
  .status-state.blocked { color: #e53935; }
  .status-state.done { color: #8B7355; }

  /* Event log */
  .event-log {
    max-height: 140px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .event-row {
    display: flex;
    gap: 8px;
    padding: 3px 0;
    border-bottom: 1px solid #3E2723;
  }

  .event-time {
    font-size: var(--fs-xxs);
    color: #8B7355;
    min-width: 36px;
  }

  .event-msg {
    font-size: var(--fs-xxs);
    color: #D4BA96;
  }

  .event-empty {
    font-size: var(--fs-xs);
    color: #8B7355;
    text-align: center;
    padding: 8px;
  }

  /* Summary */
  .summary-grid {
    display: flex;
    justify-content: space-around;
    gap: 16px;
  }

  .summary-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .summary-label {
    font-size: var(--fs-xxs);
    color: #8B7355;
  }

  .summary-value {
    font-size: var(--fs-sm);
    color: #FFF8F0;
  }
</style>
