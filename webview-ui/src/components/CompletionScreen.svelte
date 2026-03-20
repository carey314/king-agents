<!--
  King Agents — Project Completion Screen
  Shows when all tasks are done. Warm office-style celebration.
-->
<script lang="ts">
  import { gameStore } from '../stores/gameState.svelte';
  import { ROLE_INFO } from '../lib/constants';
  import type { AgentRole } from '../lib/types';

  const roles: AgentRole[] = ['router', 'coder', 'guardian', 'builder', 'scout'];

  let stats = $derived(gameStore.completionStats);

  function formatTokens(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function close() {
    gameStore.showCompletionScreen = false;
  }

  function newProject() {
    gameStore.reset();
  }

  // MVP determination
  function getMvp(): AgentRole {
    if (stats?.mvp) return stats.mvp;
    // Find the agent who used the most tokens (did the most work)
    let best: AgentRole = 'coder';
    let bestTokens = -1;
    for (const role of roles) {
      const agent = gameStore.agents[role];
      if (agent.tokenUsed > bestTokens) {
        bestTokens = agent.tokenUsed;
        best = role;
      }
    }
    return best;
  }
</script>

{#if gameStore.showCompletionScreen}
  <div class="completion-overlay">
    <div class="completion-panel">
      <!-- Title -->
      <div class="completion-title">
        <span class="title-icon">{"\u{1F389}"}</span>
        <span class="title-text">项目完成！</span>
        <span class="title-icon">{"\u{1F389}"}</span>
      </div>

      {#if gameStore.currentTask}
        <div class="completion-task">"{gameStore.currentTask}"</div>
      {/if}

      <!-- Worker contributions -->
      <div class="worker-lineup">
        {#each roles as role}
          {@const agent = gameStore.agents[role]}
          {@const info = ROLE_INFO[role]}
          {@const isMvp = getMvp() === role}
          <div class="worker-result" class:mvp={isMvp}>
            {#if isMvp}
              <div class="mvp-badge">{"\u{2B50}"} 最佳员工</div>
            {/if}
            <div class="worker-result-icon" style="background-color: #{info.color.toString(16).padStart(6, '0')}">
              {info.icon}
            </div>
            <div class="worker-result-name">{info.name}</div>
            <div class="worker-result-title">{info.title}</div>
            <div class="worker-result-tokens">{formatTokens(agent.tokenUsed)} tk</div>
            <div class="worker-result-label">贡献</div>
            <div class="worker-result-progress">
              <div class="mini-bar">
                <div class="mini-bar-fill" style="width: 100%"></div>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <!-- Stats summary -->
      <div class="stats-summary">
        <div class="stat-item">
          <span class="stat-label">{"\u{1F4B0}"} 令牌消耗</span>
          <span class="stat-value">{formatTokens(stats?.totalTokens || gameStore.totalTokens)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">{"\u{23F1}\u{FE0F}"} 总耗时</span>
          <span class="stat-value">{formatTime(stats?.duration || gameStore.time)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">{"\u{1F465}"} 成员</span>
          <span class="stat-value">{roles.length}</span>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="completion-actions">
        <button class="c-btn" onclick={close}>查看办公室</button>
        <button class="c-btn primary" onclick={newProject}>新任务</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .completion-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 80;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.55);
    animation: fadeIn 0.5s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .completion-panel {
    background: rgba(62, 39, 35, 0.95);
    border: 3px solid #4caf50;
    border-radius: 8px;
    box-shadow:
      0 0 24px rgba(76, 175, 80, 0.3),
      inset 0 0 0 1px rgba(76, 175, 80, 0.2);
    padding: 24px;
    min-width: 420px;
    max-width: 540px;
    font-family: 'Press Start 2P', monospace;
    animation: slideUp 0.5s ease;
  }

  @keyframes slideUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .completion-title {
    text-align: center;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  .title-icon {
    font-size: var(--fs-xl);
  }

  .title-text {
    font-size: var(--fs-lg);
    color: #4caf50;
    letter-spacing: 3px;
    text-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
  }

  .completion-task {
    text-align: center;
    font-size: var(--fs-xs);
    color: #D4BA96;
    margin-bottom: 16px;
    font-style: italic;
  }

  .worker-lineup {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-bottom: 16px;
  }

  .worker-result {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 8px 6px;
    background: rgba(101, 67, 33, 0.5);
    border: 1px solid #8B6914;
    border-radius: 4px;
    min-width: 64px;
    position: relative;
  }

  .worker-result.mvp {
    border-color: #FFD54F;
    box-shadow: 0 0 10px rgba(255, 213, 79, 0.2);
  }

  .mvp-badge {
    position: absolute;
    top: -10px;
    font-size: var(--fs-xxs);
    color: #FFD54F;
    background: #3E2723;
    padding: 2px 6px;
    border: 1px solid #FFD54F;
    border-radius: 2px;
  }

  .worker-result-icon {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--fs-icon);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .worker-result-name {
    font-size: var(--fs-xxs);
    color: #FFF8F0;
  }

  .worker-result-title {
    font-size: var(--fs-xxs);
    color: #C9A882;
  }

  .worker-result-tokens {
    font-size: var(--fs-xxs);
    color: #FFB74D;
  }

  .worker-result-label {
    font-size: var(--fs-xxs);
    color: #8B7355;
  }

  .worker-result-progress {
    width: 90%;
  }

  .mini-bar {
    width: 100%;
    height: 3px;
    background: #3E2723;
    border-radius: 1px;
  }

  .mini-bar-fill {
    height: 100%;
    background: #4caf50;
    border-radius: 1px;
  }

  .stats-summary {
    display: flex;
    justify-content: center;
    gap: 20px;
    padding: 12px 0;
    border-top: 1px solid #654321;
    border-bottom: 1px solid #654321;
    margin-bottom: 16px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .stat-label {
    font-size: var(--fs-xxs);
    color: #8B7355;
  }

  .stat-value {
    font-size: var(--fs-sm);
    color: #FFF8F0;
  }

  .completion-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
  }

  .c-btn {
    font-family: 'Press Start 2P', monospace;
    font-size: var(--fs-xs);
    padding: 10px 20px;
    border: 2px solid #8B7355;
    border-radius: 4px;
    background: #654321;
    color: #D4BA96;
    cursor: pointer;
    transition: all 0.1s;
  }

  .c-btn:hover {
    background: #8B6914;
    color: #FFF8F0;
    border-color: #C9A882;
  }

  .c-btn.primary {
    border-color: #4caf50;
    color: #4caf50;
  }

  .c-btn.primary:hover {
    background: rgba(76, 175, 80, 0.15);
  }

  .c-btn:active {
    transform: translateY(1px);
  }
</style>
