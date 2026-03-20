# King Agents 测试策略文档

> 文档日期：2026-03-17
> 版本：v1.0
> 适用范围：King Agents VS Code 扩展全生命周期测试

---

## 一、测试总览

### 1.1 测试金字塔

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E ╲          ← VS Code Extension 端到端测试
                 ╱────────╲           （少量，耗时长，验证关键流程）
                ╱          ╲
               ╱  集成测试    ╲      ← Agent 间协作、消息总线、API 集成
              ╱────────────────╲      （中量，验证模块间交互）
             ╱                  ╲
            ╱    单元测试         ╲  ← Agent 逻辑、状态管理、工具函数
           ╱──────────────────────╲    （大量，快速，覆盖核心逻辑）
          ╱                        ╲
         ╱    游戏 UI / 视觉测试     ╲ ← Phaser 场景、动画、渲染
        ╱──────────────────────────────╲  （专项，验证可视化正确性）
```

### 1.2 核心指标

| 指标 | 目标 |
|------|------|
| 单元测试覆盖率 | > 80%（核心模块 > 90%） |
| 集成测试覆盖率 | > 60% |
| E2E 测试 | 覆盖所有 P0 用户场景 |
| CI 流水线运行时间 | < 5 分钟 |
| 测试通过率 | 100%（不允许跳过失败测试合入） |

---

## 二、单元测试策略

### 2.1 Agent 逻辑测试

**测试范围**：`src/agents/` 目录下的所有 Agent 实现

| 测试对象 | 测试要点 | 优先级 |
|---------|---------|--------|
| `base-agent.ts` | 状态机转换（idle→working→done等）、Token 追踪、requestGank 触发 | P0 |
| `router.ts` | 意图识别、任务拆解、分配策略、Gank 决策逻辑 | P0 |
| `coder.ts` | 代码生成、diff 输出格式、根据 review 意见修正 | P0 |
| `guardian.ts` | 审查逻辑、否决权触发条件、测试代码生成 | P0 |
| `builder.ts` | 命令执行、错误日志解析、构建结果格式化 | P1 |
| `scout.ts` | 代码搜索策略、上下文收集、摘要生成 | P1 |

**测试框架**：[Vitest](https://vitest.dev/)

选择理由：
- 项目使用 Vite 构建，Vitest 零配置集成
- 兼容 Jest API，迁移成本低
- TypeScript 原生支持
- 热更新测试，开发体验好

来源：[Testing Phaser Games with Vitest](https://dev.to/davidmorais/testing-phaser-games-with-vitest-3kon)

**示例测试**：

```typescript
// tests/agents/router.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { Router } from '../../src/agents/router';
import { MessageBus } from '../../src/runtime/message-bus';

describe('Router Agent', () => {
  describe('意图识别', () => {
    it('应将"给登录页面加验证码"识别为 feature_add 类型', async () => {
      const router = createMockRouter();
      const intent = await router.identifyIntent('给登录页面加一个手机号验证码登录');
      expect(intent.type).toBe('feature_add');
      expect(intent.confidence).toBeGreaterThan(0.8);
    });

    it('应将"这个函数为什么报错"识别为 bug_fix 类型', async () => {
      const router = createMockRouter();
      const intent = await router.identifyIntent('这个函数为什么报错');
      expect(intent.type).toBe('bug_fix');
    });
  });

  describe('任务拆解', () => {
    it('应生成有效的任务 DAG', async () => {
      const router = createMockRouter();
      const tasks = await router.decompose('添加验证码登录');
      expect(tasks).toHaveLength(4);
      expect(tasks[0].assignee).toBe('scout');
      expect(tasks[1].dependencies).toContain(tasks[0].id);
    });
  });

  describe('Gank 决策', () => {
    it('当 Coder 因缺少上下文阻塞时应派 Scout 支援', () => {
      const router = createMockRouter();
      const action = router.shouldGank({
        role: 'coder',
        status: 'blocked',
        reason: 'missing_context',
      });
      expect(action.type).toBe('gank');
      expect(action.helper).toBe('scout');
    });

    it('当 Agent 重试超过 2 次时应升级给用户', () => {
      const router = createMockRouter();
      const action = router.shouldGank({
        role: 'coder',
        status: 'blocked',
        retryCount: 3,
      });
      expect(action.type).toBe('escalate');
    });
  });
});
```

### 2.2 消息总线测试

**测试范围**：`src/runtime/message-bus.ts`

| 测试要点 | 说明 |
|---------|------|
| 消息发送与接收 | 验证 pub/sub 机制正确性 |
| 消息类型过滤 | 验证 Agent 只接收相关消息 |
| 消息顺序 | 验证 FIFO 顺序保证 |
| 广播 vs 定向 | 验证单播和广播模式 |
| 错误处理 | 监听器抛异常不影响其他监听器 |
| 内存泄漏 | 验证取消订阅后不再持有引用 |

```typescript
// tests/runtime/message-bus.spec.ts
describe('MessageBus', () => {
  it('应正确路由消息到目标 Agent', () => {
    const bus = new MessageBus();
    const received: AgentMessage[] = [];

    bus.subscribe('coder', (msg) => received.push(msg));
    bus.send({ from: 'scout', to: 'coder', type: 'context', payload: {} });

    expect(received).toHaveLength(1);
    expect(received[0].from).toBe('scout');
  });

  it('广播消息应发送给所有 Agent', () => {
    const bus = new MessageBus();
    const counts = { router: 0, coder: 0, guardian: 0, builder: 0, scout: 0 };

    Object.keys(counts).forEach(role => {
      bus.subscribe(role, () => counts[role]++);
    });

    bus.broadcast({ type: 'game:victory', payload: {} });
    expect(Object.values(counts).every(c => c === 1)).toBe(true);
  });
});
```

### 2.3 状态管理测试

**测试范围**：`src/runtime/` 相关模块

| 模块 | 测试要点 |
|------|---------|
| `token-manager.ts` | 预算分配、消耗累加、阈值预警、总量统计 |
| `context-manager.ts` | 上下文隔离、缓存命中/失效、不同 Agent 接收不同上下文 |
| `task-graph.ts` | DAG 构建、拓扑排序、依赖解析、并行任务识别 |
| `orchestrator.ts` | Agent 生命周期管理、状态转换、并行/串行执行控制 |

### 2.4 GameStateManager 测试

**测试范围**：`src/runtime/game-state-manager.ts`

```typescript
// tests/runtime/game-state-manager.spec.ts
describe('GameStateManager', () => {
  describe('Agent 状态 → 游戏指令映射', () => {
    it('idle 状态应生成回泉水指令', () => {
      const gsm = new GameStateManager();
      const cmd = gsm.onAgentStateChange('coder', 'working', 'idle');
      expect(cmd.type).toBe('hero:recall');
      expect(cmd.target).toBe('fountain');
    });

    it('working 状态应生成移动到对应路指令', () => {
      const gsm = new GameStateManager();
      const cmd = gsm.onAgentStateChange('coder', 'idle', 'working');
      expect(cmd.type).toBe('hero:move');
      expect(cmd.target).toBe('mid'); // Coder 在中路
    });

    it('done 状态应生成摧毁防御塔指令', () => {
      const gsm = new GameStateManager();
      const cmd = gsm.onAgentStateChange('guardian', 'working', 'done');
      expect(cmd.type).toBe('tower:destroy');
      expect(cmd.lane).toBe('top'); // Guardian 在上路
    });
  });

  describe('Agent 消息 → 英雄交互映射', () => {
    it('Scout 传递 context 应生成递包裹动画', () => {
      const gsm = new GameStateManager();
      const cmd = gsm.onAgentMessage({
        from: 'scout', to: 'coder', type: 'context', payload: {},
      });
      expect(cmd.animation).toBe('deliver_package');
    });

    it('Guardian review 打回应生成扔盾动画', () => {
      const gsm = new GameStateManager();
      const cmd = gsm.onAgentMessage({
        from: 'guardian', to: 'coder', type: 'review', payload: { approved: false },
      });
      expect(cmd.animation).toBe('shield_throw');
    });
  });
});
```

---

## 三、集成测试策略

### 3.1 Agent 间协作流程测试

**测试范围**：多个 Agent 的端到端协作流程

| 测试场景 | 涉及 Agent | 验证要点 |
|---------|-----------|---------|
| 标准开发流程 | Router → Scout → Coder → Guardian + Builder | 任务完整执行、状态转换正确、消息传递无丢失 |
| Gank 支援流程 | Router + Scout → Coder | 阻塞检测 → 支援触发 → 恢复执行 |
| 团战流程 | 全员 | Guardian 发现严重问题 → 全员协商 → 解决 |
| 打回修改流程 | Guardian → Coder → Guardian | 审查否决 → 代码修改 → 重新审查 |
| 失败升级流程 | 任意 Agent → Router → 用户 | 重试 3 次失败 → 升级给用户 |

**LLM Mock 策略**：

```typescript
// tests/integration/helpers/mock-llm.ts
export class MockLLMAdapter implements LLMAdapter {
  private responses: Map<string, string> = new Map();

  setResponse(agentRole: AgentRole, response: string) {
    this.responses.set(agentRole, response);
  }

  async *stream(request: LLMRequest): AsyncGenerator<LLMEvent> {
    const response = this.responses.get(request.agentRole) || '';
    // 模拟逐字符流式输出
    for (const char of response) {
      yield { type: 'text_delta', text: char };
      await delay(1); // 模拟延迟
    }
    yield { type: 'done', usage: { input: 100, output: 50 } };
  }
}
```

**完整协作流程测试示例**：

```typescript
// tests/integration/full-workflow.spec.ts
describe('完整开发流程', () => {
  it('应从用户输入到任务完成走通全流程', async () => {
    const mockLLM = new MockLLMAdapter();
    const orchestrator = new Orchestrator({ llm: mockLLM });

    // 配置各 Agent 的 Mock 响应
    mockLLM.setResponse('router', JSON.stringify({
      tasks: [
        { id: 1, assignee: 'scout', action: 'search', query: '登录相关代码' },
        { id: 2, assignee: 'coder', action: 'write', deps: [1] },
        { id: 3, assignee: 'guardian', action: 'review', deps: [2] },
        { id: 4, assignee: 'builder', action: 'build', deps: [2] },
      ],
    }));
    mockLLM.setResponse('scout', '找到 src/auth/login.ts ...');
    mockLLM.setResponse('coder', 'function sendSmsCode() { ... }');
    mockLLM.setResponse('guardian', '{ "approved": true, "comments": [] }');
    mockLLM.setResponse('builder', '{ "success": true }');

    // 执行
    const events: AgentEvent[] = [];
    for await (const event of orchestrator.execute('给登录页面加验证码')) {
      events.push(event);
    }

    // 验证
    expect(events.filter(e => e.type === 'agent:state')).toHaveLength(20); // 5个Agent * 4次状态变化
    expect(events.find(e => e.type === 'task:complete')).toBeTruthy();
    expect(events.find(e => e.type === 'game:victory')).toBeTruthy();
  });
});
```

### 3.2 消息总线集成测试

| 测试要点 | 说明 |
|---------|------|
| 高并发消息 | 5 个 Agent 同时发消息，验证无丢失 |
| 消息顺序保证 | 同一 Agent 发送的消息保持 FIFO |
| 死信处理 | 目标 Agent 不存在时消息不丢失（存入死信队列） |
| 背压控制 | 消息队列满时的处理策略 |

### 3.3 LLM Adapter 集成测试

| 测试要点 | 说明 |
|---------|------|
| 流式响应解析 | SSE 事件正确解析为文本流 |
| 错误重试 | 429/503 错误自动重试 + 指数退避 |
| Token 计数 | API 返回的 usage 正确累加 |
| 并发控制 | 多 Agent 同时请求时的速率控制 |
| 超时处理 | 请求超时后正确中断和恢复 |

---

## 四、E2E 测试策略（VS Code Extension 测试）

### 4.1 测试框架选择

**主方案：`@vscode/test-electron` + Mocha**

| 工具 | 用途 | 说明 |
|------|------|------|
| [@vscode/test-electron](https://github.com/microsoft/vscode-test) | 启动 VS Code 实例运行测试 | 官方推荐，下载指定版本 VS Code 并在其中运行测试套件 |
| [@vscode/test-cli](https://code.visualstudio.com/api/working-with-extensions/testing-extension) | 命令行测试运行器 | 简化 CI 集成，支持 Mocha |
| Mocha | 测试框架 | VS Code 官方测试标准框架 |

来源：[VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)

**辅助方案（Webview E2E）：WebdriverIO**

| 工具 | 用途 |
|------|------|
| [wdio-vscode-service](https://webdriver.io/docs/extension-testing/vscode-extensions/) | 启动 VS Code + ChromeDriver，支持 Webview 内 DOM 操作 |
| [vscode-extension-tester](https://github.com/redhat-developer/vscode-extension-tester) | Red Hat 出品，Selenium WebDriver 驱动的 VS Code UI 测试 |

来源：[WebdriverIO VS Code Testing](https://webdriver.io/docs/extension-testing/vscode-extensions/)，[vscode-extension-tester](https://github.com/redhat-developer/vscode-extension-tester)

### 4.2 E2E 测试场景

| 场景 | 优先级 | 验证要点 |
|------|--------|---------|
| 扩展激活 | P0 | 安装后正确激活，命令注册成功 |
| Webview 加载 | P0 | Phaser Canvas 正确渲染，无白屏 |
| 发起任务 | P0 | 输入需求 → Router 接收 → Agent 状态变化 |
| 实时输出流 | P0 | Coder 编码时 Webview 显示实时代码流 |
| 英雄状态同步 | P1 | Agent 状态变化 → 英雄动画更新 |
| 暂停/恢复 | P1 | 点击暂停按钮 → Agent 暂停 → 恢复 |
| 任务完成 | P1 | 胜利/败北动画正确播放 |
| 侧边栏小地图 | P2 | 英雄光点实时更新位置 |
| 数据面板 | P2 | Token 经济图表正确展示 |
| 配置修改 | P2 | 修改模型配置后 Agent 使用新模型 |

### 4.3 E2E 测试配置

```typescript
// .vscode-test.mjs (官方测试配置)
import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/**/*.test.js',
  version: 'stable',
  mocha: {
    ui: 'tdd',
    timeout: 60000, // E2E 测试超时设长
  },
  launchArgs: [
    '--disable-extensions', // 禁用其他扩展避免干扰
  ],
});
```

```typescript
// tests/e2e/extension.test.ts
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('King Agents Extension', () => {
  test('扩展应正确激活', async () => {
    const ext = vscode.extensions.getExtension('king-agents.king-agents');
    assert.ok(ext);
    await ext.activate();
    assert.strictEqual(ext.isActive, true);
  });

  test('应注册所有命令', async () => {
    const commands = await vscode.commands.getCommandList();
    assert.ok(commands.includes('king-agents.startSession'));
    assert.ok(commands.includes('king-agents.openBattlefield'));
    assert.ok(commands.includes('king-agents.showHistory'));
  });

  test('Webview 应成功创建并加载', async () => {
    await vscode.commands.executeCommand('king-agents.openBattlefield');
    // Webview 创建后验证（需通过 postMessage 回调确认加载完成）
    // 这里使用事件等待模式
    const loaded = await waitForWebviewMessage('game:loaded', 10000);
    assert.ok(loaded);
  });
});
```

---

## 五、游戏 UI 测试策略

### 5.1 Phaser 场景测试

Phaser 游戏场景测试是本项目的特殊挑战。由于 Phaser 依赖 Canvas/WebGL 渲染，传统 DOM 测试工具无法直接测试。

**测试分层策略**：

| 层次 | 测试方法 | 工具 |
|------|---------|------|
| 游戏逻辑（无渲染依赖） | 纯单元测试 | Vitest |
| 状态机 + 寻路算法 | 纯单元测试 | Vitest |
| 场景初始化 + 资源加载 | Headless Phaser 测试 | Vitest + jsdom + jest-canvas-mock |
| 视觉正确性 | 截图对比测试 | Playwright / WebdriverIO |
| 动画和交互 | 手动 + 自动化混合 | WebdriverIO + 人工审查 |

来源：[Testing Phaser Games with Vitest](https://davidmorais.com/blog/testing-phaser-games-with-vitest)

### 5.2 Headless Phaser 测试配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup/phaser-mock.ts'],
    deps: {
      inline: ['phaser'],
    },
  },
});

// tests/setup/phaser-mock.ts
import 'jest-canvas-mock'; // 模拟 Canvas 2D context

// Phaser 在 jsdom 中需要的全局对象
Object.defineProperty(window, 'URL', {
  value: { createObjectURL: () => '' },
});
```

### 5.3 场景测试示例

```typescript
// tests/game/battlefield-scene.spec.ts
describe('BattlefieldScene', () => {
  let game: Phaser.Game;
  let scene: BattlefieldScene;

  beforeEach(async () => {
    game = new Phaser.Game({
      type: Phaser.HEADLESS, // 无渲染模式
      scene: [BattlefieldScene],
    });
    scene = game.scene.getScene('BattlefieldScene') as BattlefieldScene;
    await waitForSceneReady(scene);
  });

  afterEach(() => {
    game.destroy(true);
  });

  it('应创建 5 个英雄精灵', () => {
    expect(scene.heroes).toHaveLength(5);
    expect(scene.heroes.map(h => h.role)).toEqual(
      ['router', 'coder', 'guardian', 'builder', 'scout']
    );
  });

  it('英雄应在泉水位置初始化', () => {
    scene.heroes.forEach(hero => {
      expect(hero.sprite.x).toBe(scene.fountainPosition.x);
      expect(hero.sprite.y).toBe(scene.fountainPosition.y);
    });
  });

  it('接收 hero:move 指令后英雄应移动到目标路', () => {
    scene.handleGameEvent({ type: 'hero:move', role: 'coder', target: 'mid' });
    // 等待移动完成
    await waitForTweenComplete(scene);
    expect(scene.getHero('coder').currentLane).toBe('mid');
  });

  it('接收 tower:destroy 指令后防御塔应播放爆炸动画', () => {
    const tower = scene.getTower('mid', 1);
    const destroySpy = vi.spyOn(tower, 'playDestroyAnimation');
    scene.handleGameEvent({ type: 'tower:destroy', lane: 'mid' });
    expect(destroySpy).toHaveBeenCalled();
  });
});
```

### 5.4 视觉回归测试

使用截图对比检测 UI 渲染是否偏离预期：

```typescript
// tests/visual/battlefield.visual.spec.ts
// 使用 Playwright 进行截图对比
import { test, expect } from '@playwright/test';

test('战场初始状态截图对比', async ({ page }) => {
  // 加载独立的游戏 HTML（非 VS Code 环境）
  await page.goto('http://localhost:5173/game-standalone.html');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(2000); // 等待动画稳定

  const screenshot = await page.screenshot({ clip: { x: 0, y: 0, width: 800, height: 600 } });
  expect(screenshot).toMatchSnapshot('battlefield-initial.png', { threshold: 0.1 });
});
```

---

## 六、性能测试

### 6.1 Webview 内存/CPU 监控

| 监控项 | 工具/方法 | 阈值 |
|--------|---------|------|
| Webview 内存 | VS Code Process Explorer + `performance.memory` API | < 100 MB |
| Extension Host 内存 | VS Code Process Explorer | < 200 MB |
| CPU 使用率（空闲） | VS Code Process Explorer | < 2% |
| CPU 使用率（活跃） | VS Code Process Explorer | < 10% |
| 内存泄漏 | Chrome DevTools Memory Profiler（通过 Developer: Open Webview Dev Tools） | 30 分钟内无持续增长 |

### 6.2 帧率测试

```typescript
// src/game/utils/fps-monitor.ts
export class FPSMonitor {
  private frames: number[] = [];
  private lastTime = performance.now();

  update() {
    const now = performance.now();
    this.frames.push(now - this.lastTime);
    this.lastTime = now;

    // 保留最近 60 帧数据
    if (this.frames.length > 60) this.frames.shift();
  }

  getAverageFPS(): number {
    if (this.frames.length === 0) return 0;
    const avgFrameTime = this.frames.reduce((a, b) => a + b) / this.frames.length;
    return 1000 / avgFrameTime;
  }

  getMinFPS(): number {
    const maxFrameTime = Math.max(...this.frames);
    return 1000 / maxFrameTime;
  }
}
```

**帧率测试场景**：

| 场景 | 期望 FPS | 说明 |
|------|---------|------|
| 空闲（5 英雄 idle） | >= 30 | 基准性能 |
| 全员工作中 | >= 25 | 所有动画播放 |
| 团战（全员聚中路 + 特效） | >= 20 | 最高负载场景 |
| 胜利动画（全屏特效） | >= 15 | 短暂性能峰值可接受 |
| Webview 不可见 | 0 | 必须暂停渲染 |

### 6.3 API 性能测试

| 测试项 | 方法 | 指标 |
|--------|------|------|
| 单 Agent API 响应时间 | 记录首 token 延迟 | Opus < 3s, Sonnet < 1.5s |
| 5 Agent 并发 API 调用 | 同时发起 5 个请求 | 无 429 错误 |
| Token 吞吐量 | 统计每秒输出 token 数 | 符合 API Tier 限制 |
| 流式输出渲染延迟 | 从收到 token 到 Webview 显示 | < 50ms |

### 6.4 持续性能监控

在 CI 中集成性能基准测试，防止性能退化：

```yaml
# .github/workflows/perf-test.yml
name: Performance Benchmark
on: [push, pull_request]
jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - run: npm run test:perf
      - uses: benchmark-action/github-action-benchmark@v1
        with:
          tool: 'customSmallerIsBetter'
          output-file-path: perf-results.json
          alert-threshold: '120%' # 性能退化超过 20% 时告警
```

---

## 七、推荐的测试工具和框架

### 7.1 完整工具链

| 类别 | 工具 | 版本 | 用途 |
|------|------|------|------|
| **单元测试** | [Vitest](https://vitest.dev/) | ^3.x | Agent 逻辑、状态管理、工具函数 |
| **E2E（扩展）** | [@vscode/test-electron](https://github.com/microsoft/vscode-test) | ^2.x | VS Code 扩展功能测试 |
| **E2E（Webview）** | [WebdriverIO + wdio-vscode-service](https://webdriver.io/docs/extension-testing/vscode-extensions/) | ^9.x | Webview 内 UI 交互测试 |
| **E2E（辅助）** | [vscode-extension-tester](https://github.com/redhat-developer/vscode-extension-tester) | ^8.x | VS Code UI 元素测试（TreeView 等） |
| **视觉回归** | [Playwright](https://playwright.dev/) | ^1.x | 截图对比测试（独立游戏页面） |
| **Canvas Mock** | [jest-canvas-mock](https://github.com/nicktomlin/jest-canvas-mock) | ^2.x | jsdom 中模拟 Canvas 2D API |
| **Mock** | Vitest 内置 vi.mock/vi.spyOn | - | LLM 响应 Mock、VS Code API Mock |
| **覆盖率** | Vitest 内置 c8/istanbul | - | 代码覆盖率统计 |
| **性能** | [Benchmark.js](https://benchmarkjs.com/) | ^2.x | 关键路径性能基准测试 |
| **Lint** | ESLint + Prettier | - | 代码质量门禁 |

### 7.2 VS Code API Mock

由于单元测试不在 VS Code 环境中运行，需要 Mock VS Code API：

```typescript
// tests/setup/vscode-mock.ts
import { vi } from 'vitest';

// Mock VS Code API
vi.mock('vscode', () => ({
  window: {
    createWebviewPanel: vi.fn(),
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
  },
  workspace: {
    getConfiguration: vi.fn().mockReturnValue({
      get: vi.fn(),
    }),
  },
  ExtensionContext: vi.fn(),
  Uri: { file: vi.fn(), parse: vi.fn() },
  commands: {
    registerCommand: vi.fn(),
  },
  SecretStorage: vi.fn(),
}));
```

### 7.3 CI/CD 集成

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v4

  integration-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:integration

  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm run build
      - run: xvfb-run -a npm run test:e2e  # Linux 需要虚拟显示

  visual-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm run build
      - run: npx playwright install --with-deps
      - run: npm run test:visual
```

### 7.4 测试命令汇总

```json
// package.json scripts
{
  "test": "npm run test:unit && npm run test:integration",
  "test:unit": "vitest run --project unit",
  "test:unit:watch": "vitest --project unit",
  "test:integration": "vitest run --project integration",
  "test:e2e": "vscode-test",
  "test:e2e:webview": "wdio run wdio.conf.ts",
  "test:visual": "playwright test tests/visual/",
  "test:perf": "vitest run --project perf",
  "test:coverage": "vitest run --coverage"
}
```

---

## 八、测试阶段计划

| 阶段 | 测试重点 | 覆盖率目标 |
|------|---------|-----------|
| **Phase 1 (MVP)** | Router/Coder/Scout 单元测试 + 基础 E2E | 单元 70%+ |
| **Phase 2 (完整五人)** | 全 Agent 单元测试 + 协作流程集成测试 | 单元 80%+，集成 50%+ |
| **Phase 3 (打磨)** | 游戏 UI 测试 + 性能测试 + 视觉回归 | 单元 85%+，集成 60%+ |
| **Phase 4 (发布)** | 全量 E2E + 多平台测试 + 安全测试 | 全量达标 |
