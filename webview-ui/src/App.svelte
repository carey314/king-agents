<!--
  King Agents — Main App
  Pixel Office Studio Edition (Warm Cozy Style)
  Layout: Phaser Canvas + Svelte HUD Overlay
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Phaser from 'phaser';
  import { OfficeScene } from './game/OfficeScene';
  import { gameStore } from './stores/gameState.svelte';
  import { WORLD_WIDTH, WORLD_HEIGHT } from './lib/constants';
  import type { AgentRole } from './lib/types';

  import HUD from './components/HUD.svelte';
  import WorkerBubble from './components/WorkerBubble.svelte';
  import DataPanel from './components/DataPanel.svelte';
  import CompletionScreen from './components/CompletionScreen.svelte';

  import './app.css';

  let gameContainer: HTMLDivElement;
  let game: Phaser.Game | null = null;
  let officeScene: OfficeScene | null = null;

  // Sync game state to Phaser scene
  function syncGameState() {
    if (!officeScene) return;

    const roles: AgentRole[] = ['router', 'coder', 'guardian', 'builder', 'scout'];

    for (const role of roles) {
      const agent = gameStore.agents[role];
      officeScene.updateWorkerState(role, agent.status, agent.progress);

      // Set bubble text for certain statuses
      if (agent.currentTask && agent.status === 'working') {
        officeScene.setWorkerBubble(role, agent.currentTask);
      } else if (agent.status === 'blocked' && agent.error) {
        officeScene.setWorkerBubble(role, agent.error);
      }
    }
  }

  // Start sync loop (throttled)
  function startSyncLoop(): () => void {
    const interval = setInterval(() => {
      syncGameState();
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }

  onMount(() => {
    // Create Phaser game
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      parent: gameContainer,
      backgroundColor: '#F5E6D3',
      scene: [OfficeScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        pixelArt: true,
        antialias: false,
        roundPixels: true,
      },
      input: {
        mouse: {
          preventDefaultWheel: false,
        },
      },
      audio: {
        disableWebAudio: true,
      },
    };

    game = new Phaser.Game(config);

    // Wait for scene to be ready
    game.events.on('ready', () => {
      officeScene = game!.scene.getScene('OfficeScene') as OfficeScene;

      // Wire worker click events
      officeScene.onWorkerClick = (role: AgentRole) => {
        gameStore.selectWorker(role);
        officeScene!.focusWorker(role);
      };
    });

    // Initialize VS Code bridge
    gameStore.initBridge();

    // Start sync loop
    const stopSync = startSyncLoop();

    // For dev mode: start a demo project
    if (!gameStore.matchId) {
      gameStore.startMatch(1, '给登录页加验证码');
      startDemoMode();
    }

    return () => {
      stopSync();
    };
  });

  onDestroy(() => {
    if (game) {
      game.destroy(true);
      game = null;
      officeScene = null;
    }
  });

  // ================================================================
  // DEMO MODE — 25-second automated demonstration (Chinese messages)
  // ================================================================
  function startDemoMode() {
    const roles: AgentRole[] = ['router', 'coder', 'guardian', 'builder', 'scout'];

    // Phase 0 (0s): Everyone is in the lounge having coffee
    // (Initial state — all idle in lounge)

    // Phase 1 (2s): Task received! Toast notification
    setTimeout(() => {
      if (!officeScene) return;
      gameStore.setPhase('working');
      officeScene.showEvent({
        id: 'e0',
        type: 'task_start',
        message: '新任务：给登录页加验证码',
        timestamp: Date.now(),
      });
      gameStore.addEvent({
        id: 'e0',
        type: 'task_start',
        message: '新任务：给登录页加验证码',
        timestamp: Date.now(),
      });
    }, 2000);

    // Phase 2 (3s): Router goes to meeting room, draws on whiteboard
    setTimeout(() => {
      if (!officeScene) return;
      gameStore.updateAgent('router', {
        status: 'working',
        currentTask: '分析任务需求...',
        startTime: Date.now(),
      });
      officeScene.moveWorkerToWork('router');
      // Whiteboard gets drawn after arrival
      setTimeout(() => {
        officeScene?.drawOnWhiteboard();
        officeScene?.startWorkAnimation('router');
      }, 1500);
    }, 3000);

    // Phase 3 (5s): Router done, Scout heads to library
    setTimeout(() => {
      if (!officeScene) return;
      gameStore.updateAgent('router', {
        status: 'done',
        progress: 100,
        tokenUsed: 420,
      });
      officeScene.workerThumbsUp('router');
      officeScene.showEvent({
        id: 'e1',
        type: 'task_done',
        message: '路由：任务已拆解为3个子任务',
        timestamp: Date.now(),
      });
      gameStore.addEvent({
        id: 'e1',
        type: 'task_done',
        message: '路由：任务已拆解为3个子任务',
        timestamp: Date.now(),
      });

      // Scout starts searching
      gameStore.updateAgent('scout', {
        status: 'working',
        currentTask: '搜索相关代码上下文...',
        startTime: Date.now(),
      });
      officeScene.moveWorkerToWork('scout');
      setTimeout(() => {
        officeScene?.startWorkAnimation('scout');
      }, 1500);
    }, 5000);

    // Phase 4 (8s): Scout finds files, carries them to Coder's room
    setTimeout(() => {
      if (!officeScene) return;
      gameStore.updateAgent('scout', {
        status: 'done',
        progress: 100,
        tokenUsed: 543,
      });
      officeScene.showEvent({
        id: 'e2',
        type: 'search_done',
        message: '侦查找到了3个相关文件！',
        timestamp: Date.now(),
      });
      gameStore.addEvent({
        id: 'e2',
        type: 'search_done',
        message: '侦查找到了3个相关文件！',
        timestamp: Date.now(),
      });
      gameStore.addFileTransfer({
        id: 'ft1',
        from: 'scout',
        to: 'coder',
        label: '3个代码文件',
        timestamp: Date.now(),
      });

      // Scout walks to coder's room to deliver files
      officeScene.moveWorkerToRoom('scout', 'coderoom');
      officeScene.workerEmoji('scout', '\u{1F4C1}');
    }, 8000);

    // Phase 5 (9s): Coder starts coding, monitors come alive
    setTimeout(() => {
      if (!officeScene) return;
      gameStore.updateAgent('coder', {
        status: 'working',
        currentTask: '编写验证码逻辑...',
        output: 'async function sendSmsCode(phone: string) {\n  const code = generateCode();\n',
        startTime: Date.now(),
      });
      officeScene.moveWorkerToWork('coder');
      setTimeout(() => {
        officeScene?.setCodeRoomMonitorsCoding();
        officeScene?.startWorkAnimation('coder');
      }, 1500);

      // Scout goes back to lounge
      officeScene.moveWorkerToLounge('scout');

      // Router also goes to lounge
      officeScene.moveWorkerToLounge('router');
    }, 9000);

    // Phase 5.5 (12s): Coder makes progress
    setTimeout(() => {
      if (!officeScene) return;
      gameStore.updateAgent('coder', {
        progress: 50,
        tokenUsed: 1200,
        output: 'async function sendSmsCode(phone: string) {\n  const code = generateCode();\n  await redis.set(`sms:${phone}`, code, "EX", 300);\n  await smsProvider.send(phone, code);\n  return { success: true };\n}\n',
      });
    }, 12000);

    // Phase 6 (15s): Coder done, carries code to Guardian for review
    setTimeout(() => {
      if (!officeScene) return;
      gameStore.updateAgent('coder', {
        status: 'done',
        progress: 100,
        tokenUsed: 1847,
      });
      officeScene.setCodeRoomMonitorsIdle();
      officeScene.showEvent({
        id: 'e3',
        type: 'code_submit',
        message: '编码提交代码待审查',
        timestamp: Date.now(),
      });
      gameStore.addEvent({
        id: 'e3',
        type: 'code_submit',
        message: '编码提交代码待审查',
        timestamp: Date.now(),
      });
      gameStore.addFileTransfer({
        id: 'ft2',
        from: 'coder',
        to: 'guardian',
        label: '代码审查请求',
        timestamp: Date.now(),
      });

      // Coder walks to test lab
      officeScene.moveWorkerToRoom('coder', 'testlab');
      officeScene.workerEmoji('coder', '\u{1F4DD}');
    }, 15000);

    // Phase 7 (16s): Guardian starts reviewing
    setTimeout(() => {
      if (!officeScene) return;
      gameStore.updateAgent('guardian', {
        status: 'working',
        currentTask: '审查代码 + 检查问题...',
        startTime: Date.now(),
      });
      officeScene.moveWorkerToWork('guardian');
      setTimeout(() => {
        officeScene?.setTestMonitorCoding();
        officeScene?.startWorkAnimation('guardian');
      }, 1500);

      // Coder goes to lounge to wait
      officeScene.moveWorkerToLounge('coder');
    }, 16000);

    // Phase 8 (18s): Guardian approves! Green stamp.
    setTimeout(() => {
      if (!officeScene) return;
      gameStore.updateAgent('guardian', {
        status: 'done',
        progress: 100,
        tokenUsed: 780,
      });
      officeScene.setTestMonitorSuccess();
      officeScene.workerStamp('guardian', true);
      officeScene.showEvent({
        id: 'e4',
        type: 'review_pass',
        message: '审查：代码审查通过！',
        timestamp: Date.now(),
      });
      gameStore.addEvent({
        id: 'e4',
        type: 'review_pass',
        message: '审查：代码审查通过！',
        timestamp: Date.now(),
      });

      // Builder starts deploying simultaneously
      gameStore.updateAgent('builder', {
        status: 'working',
        currentTask: '构建和部署中...',
        startTime: Date.now(),
      });
      officeScene.moveWorkerToWork('builder');
      setTimeout(() => {
        officeScene?.startServerBlink();
        officeScene?.startWorkAnimation('builder');
        officeScene?.setDeployMonitorProgress(0);
      }, 1500);
    }, 18000);

    // Phase 8.5 (19.5s): Deploy progress
    setTimeout(() => {
      if (!officeScene) return;
      gameStore.updateAgent('builder', { progress: 50 });
      officeScene.setDeployMonitorProgress(50);
    }, 19500);

    // Phase 9 (21s): Build complete!
    setTimeout(() => {
      if (!officeScene) return;
      gameStore.updateAgent('builder', {
        status: 'done',
        progress: 100,
        tokenUsed: 320,
      });
      officeScene.setServerGreen();
      officeScene.setDeployMonitorSuccess();
      officeScene.showEvent({
        id: 'e5',
        type: 'build_success',
        message: '构建成功！已部署！',
        timestamp: Date.now(),
      });
      gameStore.addEvent({
        id: 'e5',
        type: 'build_success',
        message: '构建成功！已部署！',
        timestamp: Date.now(),
      });
      officeScene.workerEmoji('builder', '\u{1F680}');

      // Guardian goes to lounge
      officeScene.moveWorkerToLounge('guardian');
    }, 21000);

    // Phase 10 (23s): Everyone walks back to lounge
    setTimeout(() => {
      if (!officeScene) return;
      for (const role of roles) {
        gameStore.updateAgent(role, { status: 'done' });
        officeScene.moveWorkerToLounge(role);
      }
    }, 23000);

    // Phase 11 (24s): Celebration!
    setTimeout(() => {
      if (!officeScene) return;
      officeScene.allCelebrate();
      officeScene.showEvent({
        id: 'e6',
        type: 'victory',
        message: '项目完成！团队击掌！',
        timestamp: Date.now(),
      });
      gameStore.addEvent({
        id: 'e6',
        type: 'victory',
        message: '项目完成！团队击掌！',
        timestamp: Date.now(),
      });
    }, 24000);

    // Phase 12 (25s): Show completion screen
    setTimeout(() => {
      gameStore.endMatch({
        mvp: 'coder',
        duration: gameStore.time,
        totalTokens: gameStore.totalTokens,
        contributions: {
          router: { tokens: 420, tasks: 1 },
          coder: { tokens: 1847, tasks: 1 },
          guardian: { tokens: 780, tasks: 1 },
          builder: { tokens: 320, tasks: 1 },
          scout: { tokens: 543, tasks: 1 },
        },
      });
    }, 25000);
  }
</script>

<div class="app-root">
  <!-- Phaser Canvas Container -->
  <div class="game-container" bind:this={gameContainer}></div>

  <!-- Svelte HUD Overlay (on top of canvas) -->
  <div class="hud-overlay">
    <HUD />

    {#if gameStore.selectedWorker}
      <WorkerBubble role={gameStore.selectedWorker} />
    {/if}

    {#if gameStore.activeView === 'data'}
      <DataPanel />
    {/if}

    <CompletionScreen />
  </div>
</div>

<style>
  .app-root {
    width: 100%;
    height: 100vh;
    position: relative;
    overflow: hidden;
    background: #F5E6D3;
  }

  .game-container {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }

  .game-container :global(canvas) {
    display: block;
    image-rendering: pixelated;
  }

  .hud-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10;
  }

  .hud-overlay :global(*) {
    pointer-events: auto;
  }

  .hud-overlay :global(.hud-overlay-pass) {
    pointer-events: none;
  }
</style>
