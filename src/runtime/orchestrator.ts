/**
 * Orchestrator — 编排引擎
 *
 * 管理 5 个 Agent 的生命周期，负责：
 * 1. 初始化所有 Agent
 * 2. 根据 Router 的任务计划串行/并行调度
 * 3. 管理 Agent 间的数据流
 * 4. 处理 Gank 请求
 * 5. 收集执行结果
 * 6. 发出对局开始/结束等全局事件
 */

import { EventEmitter } from "events";
import {
  type AgentEvent,
  type AgentRole,
  type AgentState,
  type ILLMAdapter,
  type SessionStats,
  type Task,
  type TaskContext,
  type TaskResult,
} from "../agents/base-agent.js";
import { RouterAgent, type TaskPlan } from "../agents/router.js";
import { CoderAgent } from "../agents/coder.js";
import { GuardianAgent } from "../agents/guardian.js";
import { BuilderAgent, type ICommandExecutor } from "../agents/builder.js";
import { ScoutAgent, type IFileSystem } from "../agents/scout.js";
import { MessageBus } from "./message-bus.js";
import { GameStateManager } from "./game-state-manager.js";

// ─── Orchestrator 类型 ────────────────────────────────────────

/** 对局阶段 */
export type SessionPhase =
  | "idle"          // 待机
  | "planning"      // Router 拆解任务
  | "laning"        // 前期：Scout 搜索上下文
  | "roaming"       // 中期：Coder 编码
  | "teamfight"     // 后期：Guardian + Builder 并行
  | "summarizing"   // 汇总结果
  | "victory"       // 胜利
  | "defeat";       // 失败

/** 对局状态 */
export interface SessionState {
  id: string;
  phase: SessionPhase;
  startTime: number;
  userPrompt: string;
  plan: TaskPlan | null;
  agentStates: Record<AgentRole, AgentState>;
  results: Map<string, TaskResult>;
  stats: Partial<SessionStats>;
}

/** Orchestrator 配置 */
export interface OrchestratorConfig {
  maxRetries: number;
  maxReviewRounds: number;
  /** 超时时间（毫秒） */
  sessionTimeout: number;
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxRetries: 3,
  maxReviewRounds: 3,
  sessionTimeout: 600000, // 10 分钟
};

// ─── Orchestrator ─────────────────────────────────────────────

export class Orchestrator extends EventEmitter {
  private config: OrchestratorConfig;

  // Agent 实例
  private router: RouterAgent;
  private coder: CoderAgent;
  private guardian: GuardianAgent;
  private builder: BuilderAgent;
  private scout: ScoutAgent;

  // 运行时
  private bus: MessageBus;
  private gameState: GameStateManager;

  // 对局状态
  private session: SessionState | null = null;
  private abortController: AbortController | null = null;

  constructor(
    llmAdapters: {
      opus: ILLMAdapter;
      sonnet: ILLMAdapter;
    },
    config?: Partial<OrchestratorConfig>,
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 初始化消息总线
    this.bus = new MessageBus();

    // 初始化 Agent（Opus 给 Router/Coder/Guardian，Sonnet 给 Builder/Scout）
    this.router = new RouterAgent(llmAdapters.opus, this.bus);
    this.coder = new CoderAgent(llmAdapters.opus, this.bus);
    this.guardian = new GuardianAgent(llmAdapters.opus, this.bus);
    this.builder = new BuilderAgent(llmAdapters.sonnet, this.bus);
    this.scout = new ScoutAgent(llmAdapters.sonnet, this.bus);

    // 初始化 GameStateManager
    this.gameState = new GameStateManager(this.bus);

    // 绑定内部事件
    this.setupEventHandlers();
  }

  // ─── 公共 API ───────────────────────────────────────────────

  /** 设置文件系统（用于 Scout） */
  setFileSystem(fs: IFileSystem): void {
    this.scout.setFileSystem(fs);
  }

  /** 设置命令执行器（用于 Builder） */
  setCommandExecutor(executor: ICommandExecutor): void {
    this.builder.setCommandExecutor(executor);
  }

  /** 获取 GameStateManager（供 Webview 绑定） */
  getGameStateManager(): GameStateManager {
    return this.gameState;
  }

  /** 获取 MessageBus */
  getMessageBus(): MessageBus {
    return this.bus;
  }

  /** 获取当前对局状态 */
  getSessionState(): SessionState | null {
    return this.session;
  }

  /** 获取所有 Agent 状态快照 */
  getAgentStates(): Record<AgentRole, AgentState> {
    return {
      router: this.router.getState(),
      coder: this.coder.getState(),
      guardian: this.guardian.getState(),
      builder: this.builder.getState(),
      scout: this.scout.getState(),
    };
  }

  /**
   * 开始新对局
   * 这是主入口 — 用户输入一个需求，整个 Agent 战队开始协作
   */
  async startSession(userPrompt: string): Promise<void> {
    if (this.session?.phase !== "idle" && this.session !== null) {
      throw new Error("A session is already in progress. Cancel it first.");
    }

    // 初始化对局
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.session = {
      id: sessionId,
      phase: "idle",
      startTime: Date.now(),
      userPrompt,
      plan: null,
      agentStates: this.getAgentStates(),
      results: new Map(),
      stats: {
        kills: 0,
        deaths: 0,
        assists: 0,
        totalTokens: 0,
        agentTokens: { router: 0, coder: 0, guardian: 0, builder: 0, scout: 0 },
      },
    };

    this.abortController = new AbortController();
    this.bus.clearHistory();

    // 通知开始
    this.emit("session:start", { id: sessionId, prompt: userPrompt });
    this.gameState.onSessionStart(sessionId);

    try {
      // Phase 1: Planning — Router 分析和拆解任务
      await this.phasePlanning(userPrompt);

      if (!this.session.plan) {
        throw new Error("Router failed to produce a task plan");
      }

      // Phase 2-4: 按照计划执行
      await this.executeTaskPlan(this.session.plan);

      // Phase 5: Summarizing — Router 汇总结果
      await this.phaseSummarizing();

      // Victory!
      this.setPhase("victory");
      const stats = this.calculateStats();
      this.gameState.onTaskComplete(stats);
      this.emit("session:victory", { id: sessionId, stats });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (errorMsg === "Session cancelled") {
        this.setPhase("defeat");
        this.gameState.onTaskFailed("Cancelled by user");
        this.emit("session:cancelled", { id: sessionId });
      } else {
        this.setPhase("defeat");
        this.gameState.onTaskFailed(errorMsg);
        this.emit("session:defeat", { id: sessionId, error: errorMsg });
      }
    } finally {
      this.abortController = null;
    }
  }

  /**
   * 取消当前对局
   */
  cancelSession(): void {
    if (!this.session) return;
    this.abortController?.abort();
    this.resetAllAgents();
    this.emit("session:cancelled", { id: this.session.id });
  }

  // ─── 对局阶段 ──────────────────────────────────────────────

  private setPhase(phase: SessionPhase): void {
    if (!this.session) return;
    this.session.phase = phase;
    this.emit("session:phase", { phase });
  }

  /**
   * Phase 1: Planning — Router 分析用户需求
   */
  private async phasePlanning(userPrompt: string): Promise<void> {
    this.setPhase("planning");

    const task: Task = {
      id: "plan_main",
      type: "feature",
      description: "Analyze user request and create task plan",
      userPrompt,
      dependencies: [],
      assignee: "router",
      context: { files: [], codeSnippets: [], upstreamOutputs: [], metadata: {} },
      priority: 10,
    };

    const context: TaskContext = {
      files: [],
      codeSnippets: [],
      upstreamOutputs: [],
      metadata: {},
    };

    // 执行 Router
    for await (const event of this.router.execute(task, context)) {
      this.checkAborted();
      this.handleAgentEvent("router", event);
    }

    // 获取计划
    this.session!.plan = this.router.getPlan();
  }

  /**
   * Phase 2-4: 按执行计划逐步调度
   */
  private async executeTaskPlan(plan: TaskPlan): Promise<void> {
    for (let stepIndex = 0; stepIndex < plan.executionOrder.length; stepIndex++) {
      this.checkAborted();

      const step = plan.executionOrder[stepIndex];
      const tasksInStep = step.parallel
        .map((taskId) => plan.tasks.find((t) => t.id === taskId))
        .filter((t): t is NonNullable<typeof t> => t !== undefined);

      // 确定当前阶段
      if (tasksInStep.some((t) => t.assignee === "scout")) {
        this.setPhase("laning");
      } else if (tasksInStep.some((t) => t.assignee === "coder")) {
        this.setPhase("roaming");
      } else {
        this.setPhase("teamfight");
      }

      // 并行执行本步骤的所有任务
      const promises = tasksInStep.map((plannedTask) =>
        this.executeAgentTask(plannedTask, plan),
      );

      const results = await Promise.allSettled(promises);

      // 检查失败
      for (const result of results) {
        if (result.status === "rejected") {
          const error = result.reason instanceof Error ? result.reason.message : String(result.reason);
          // 尝试 Gank 恢复
          const recovered = await this.attemptRecovery(error);
          if (!recovered) {
            throw new Error(`Task execution failed: ${error}`);
          }
        }
      }
    }

    // Guardian/Coder 的 review 循环
    await this.handleReviewLoop(plan);
  }

  /**
   * 执行单个 Agent 的任务
   */
  private async executeAgentTask(
    plannedTask: { id: string; assignee: AgentRole; description: string; context: string },
    plan: TaskPlan,
  ): Promise<TaskResult | null> {
    const agent = this.getAgent(plannedTask.assignee);

    // 构建任务上下文
    const taskContext = this.buildTaskContext(plannedTask, plan);

    const task: Task = {
      id: plannedTask.id,
      type: plan.intent as Task["type"],
      description: plannedTask.description,
      userPrompt: this.session!.userPrompt,
      dependencies: [],
      assignee: plannedTask.assignee,
      context: taskContext,
      priority: 8,
    };

    let lastResult: TaskResult | null = null;

    for await (const event of agent.execute(task, taskContext)) {
      this.checkAborted();
      this.handleAgentEvent(plannedTask.assignee, event);

      if (event.type === "task_complete") {
        lastResult = event.result;
        this.session!.results.set(plannedTask.id, event.result);
      }

      if (event.type === "error" && !event.recoverable) {
        throw new Error(event.error);
      }
    }

    return lastResult;
  }

  /**
   * 处理 Guardian ↔ Coder 的 Review 循环
   */
  private async handleReviewLoop(plan: TaskPlan): Promise<void> {
    // 检查是否有 Guardian 审查任务
    const guardianTask = plan.tasks.find((t) => t.assignee === "guardian");
    if (!guardianTask) return;

    // Guardian 审查完后看结果
    const guardianResult = this.session!.results.get(guardianTask.id);
    if (!guardianResult?.reviewComments) return;

    // 如果有 critical/error 级别的意见，且没超过最大轮次
    const hasSerious = guardianResult.reviewComments.some(
      (c) => c.severity === "critical" || c.severity === "error",
    );

    if (hasSerious && !this.guardian.isMaxReviewReached()) {
      // Coder 修改代码
      this.setPhase("teamfight");
      this.session!.stats.assists = (this.session!.stats.assists ?? 0) + 1;

      const coderTask = plan.tasks.find((t) => t.assignee === "coder");
      if (!coderTask) return;

      const task: Task = {
        id: `${coderTask.id}_review_fix`,
        type: plan.intent as Task["type"],
        description: "Fix issues from code review",
        userPrompt: this.session!.userPrompt,
        dependencies: [],
        assignee: "coder",
        context: {
          files: [],
          codeSnippets: [],
          upstreamOutputs: [
            {
              role: "guardian",
              output: guardianResult.reviewComments
                .map((c) => `[${c.severity}] ${c.filePath}: ${c.message}`)
                .join("\n"),
            },
          ],
          metadata: {},
        },
        priority: 10,
      };

      // Coder 处理 review feedback
      for await (const event of this.coder.handleReview(
        guardianResult.reviewComments,
        task,
        task.context,
      )) {
        this.checkAborted();
        this.handleAgentEvent("coder", event);
      }

      // 重新 Guardian 审查
      for await (const event of this.guardian.execute(task, {
        files: [],
        codeSnippets: [],
        upstreamOutputs: [{ role: "coder", output: this.coder.getCurrentDiff() }],
        metadata: { reviewRound: this.guardian.getReviewRound() },
      })) {
        this.checkAborted();
        this.handleAgentEvent("guardian", event);
      }
    }
  }

  /**
   * Phase 5: Summarizing
   */
  private async phaseSummarizing(): Promise<void> {
    this.setPhase("summarizing");

    const results = new Map<AgentRole, string>();
    for (const [, result] of this.session!.results) {
      results.set("coder" as AgentRole, result.output);
    }

    const task: Task = {
      id: "summarize",
      type: "feature",
      description: "Summarize all results",
      userPrompt: this.session!.userPrompt,
      dependencies: [],
      assignee: "router",
      context: { files: [], codeSnippets: [], upstreamOutputs: [], metadata: {} },
      priority: 10,
    };

    for await (const event of this.router.summarizeResults(results, task)) {
      this.checkAborted();
      this.handleAgentEvent("router", event);
    }
  }

  // ─── 事件处理 ──────────────────────────────────────────────

  private setupEventHandlers(): void {
    // Agent 状态变化 → 转发给外部
    this.bus.on("agent:state_change", (data) => {
      this.emit("agent:state_change", data);
      if (this.session) {
        this.session.agentStates = this.getAgentStates();
      }
    });

    // Agent 输出 → 转发给外部
    this.bus.on("agent:output_delta", (data) => {
      this.emit("agent:output_delta", data);
    });

    // Token 使用 → 统计
    this.bus.on("agent:token_usage", (data) => {
      const { role, usage } = data as { role: AgentRole; usage: { inputTokens: number; outputTokens: number } };
      if (this.session?.stats) {
        const total = usage.inputTokens + usage.outputTokens;
        this.session.stats.totalTokens = (this.session.stats.totalTokens ?? 0) + total;
        if (this.session.stats.agentTokens) {
          this.session.stats.agentTokens[role] += total;
        }
      }
      this.emit("agent:token_usage", data);
    });

    // Gank 请求
    this.bus.on("gank:request", (data) => {
      this.emit("gank:request", data);
    });
  }

  private handleAgentEvent(role: AgentRole, event: AgentEvent): void {
    switch (event.type) {
      case "status_change":
        this.emit("agent:status", { role, status: event.status });
        break;
      case "progress":
        this.emit("agent:progress", { role, ...event });
        break;
      case "output_delta":
        // 已通过 bus 事件转发
        break;
      case "error":
        this.emit("agent:error", { role, ...event });
        if (!event.recoverable) {
          this.session!.stats.deaths = (this.session!.stats.deaths ?? 0) + 1;
        }
        break;
      case "task_complete":
        if (event.result.success) {
          this.session!.stats.kills = (this.session!.stats.kills ?? 0) + 1;
        }
        this.emit("agent:task_complete", { role, result: event.result });
        break;
    }
  }

  // ─── 辅助方法 ──────────────────────────────────────────────

  private getAgent(role: AgentRole) {
    switch (role) {
      case "router": return this.router;
      case "coder": return this.coder;
      case "guardian": return this.guardian;
      case "builder": return this.builder;
      case "scout": return this.scout;
    }
  }

  private buildTaskContext(
    plannedTask: { assignee: AgentRole; context: string },
    _plan: TaskPlan,
  ): TaskContext {
    // 收集上游 Agent 的输出
    const upstreamOutputs: Array<{ role: AgentRole; output: string }> = [];

    for (const [, result] of this.session!.results) {
      upstreamOutputs.push({
        role: result.taskId.includes("scout")
          ? "scout"
          : result.taskId.includes("coder")
            ? "coder"
            : "router",
        output: result.output,
      });
    }

    return {
      files: [],
      codeSnippets: [],
      upstreamOutputs,
      metadata: {
        agentContext: plannedTask.context,
      },
    };
  }

  private async attemptRecovery(error: string): Promise<boolean> {
    try {
      const decision = await this.router.makeGankDecision(
        "coder", // 默认假设是 coder 卡住
        error,
        1,
      );

      switch (decision.action) {
        case "retry":
          return true; // 让调用方重试
        case "gank":
          if (decision.helper === "scout") {
            // Scout 快速搜索
            for await (const _ of this.scout.quickSearch(error, "coder")) {
              // 消耗事件
            }
            return true;
          }
          return false;
        case "escalate":
          this.emit("session:escalate", { reason: error });
          return false;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  private checkAborted(): void {
    if (this.abortController?.signal.aborted) {
      throw new Error("Session cancelled");
    }
  }

  private resetAllAgents(): void {
    this.router.reset();
    this.coder.reset();
    this.guardian.reset();
    this.builder.reset();
    this.scout.reset();
  }

  private calculateStats(): SessionStats {
    const states = this.getAgentStates();
    const agentTokens: Record<AgentRole, number> = {
      router: states.router.tokenUsed,
      coder: states.coder.tokenUsed,
      guardian: states.guardian.tokenUsed,
      builder: states.builder.tokenUsed,
      scout: states.scout.tokenUsed,
    };

    const totalTokens = Object.values(agentTokens).reduce((a, b) => a + b, 0);

    // MVP: token 效率最高的 agent（完成任务数 / token 消耗）
    let mvp: AgentRole = "coder";
    let bestEfficiency = 0;
    for (const [role, tokens] of Object.entries(agentTokens)) {
      const agent = this.getAgent(role as AgentRole);
      if (agent.getState().status === "done" && tokens > 0) {
        const efficiency = 1 / tokens;
        if (efficiency > bestEfficiency) {
          bestEfficiency = efficiency;
          mvp = role as AgentRole;
        }
      }
    }

    return {
      kills: this.session?.stats.kills ?? 0,
      deaths: this.session?.stats.deaths ?? 0,
      assists: this.session?.stats.assists ?? 0,
      mvp,
      duration: Date.now() - (this.session?.startTime ?? Date.now()),
      totalTokens,
      agentTokens,
    };
  }
}
