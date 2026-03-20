/**
 * Base Agent — 所有 Agent 的基类
 *
 * 定义了 Agent 的状态机、生命周期、事件发射机制。
 * 每个具体 Agent（Router, Coder, Guardian, Builder, Scout）继承此类并实现 execute()。
 */

import { EventEmitter } from "events";

// ─── 核心类型定义 ───────────────────────────────────────────────

/** 五大角色 */
export type AgentRole = "router" | "coder" | "guardian" | "builder" | "scout";

/** Agent 状态（对应地图上的英雄行为） */
export type AgentStatus =
  | "idle"      // 在泉水，等待任务
  | "working"   // 正在执行任务
  | "waiting"   // 等待其他 Agent 的输出
  | "blocked"   // 出错或卡住
  | "done"      // 当前任务完成
  | "ganking";  // 正在支援其他路

/** Agent 的完整状态快照 */
export interface AgentState {
  role: AgentRole;
  status: AgentStatus;
  currentTask: string | null;
  progress: number;           // 0-100
  tokenUsed: number;
  tokenBudget: number;
  output: string;             // 当前实时输出（streaming 拼接）
  startTime: number | null;
  error: string | null;
  retryCount: number;
}

/** Agent 间消息类型 */
export type AgentMessageType =
  | "context"        // Scout → Coder: 上下文数据
  | "code"           // Coder → Guardian: 代码 diff
  | "review"         // Guardian → Coder: 审查意见
  | "build_result"   // Builder → Router: 构建结果
  | "gank_request"   // Any → Router: 请求支援
  | "task_assign"    // Router → Any: 任务分配
  | "clarification"  // Router → User: 需要澄清
  | "escalation";    // Any → Router: 升级问题

/** Agent 间消息 */
export interface AgentMessage {
  id: string;
  from: AgentRole;
  to: AgentRole | "broadcast";
  type: AgentMessageType;
  payload: unknown;
  timestamp: number;
}

/** 任务定义 */
export interface Task {
  id: string;
  type: "feature" | "bugfix" | "refactor" | "question" | "review" | "build";
  description: string;
  /** 用户原始输入 */
  userPrompt: string;
  /** 依赖的其他任务 ID */
  dependencies: string[];
  /** 分配给哪个 Agent */
  assignee: AgentRole;
  /** 额外的上下文 */
  context: TaskContext;
  /** 任务优先级 0-10 */
  priority: number;
}

/** 任务上下文 */
export interface TaskContext {
  /** 相关文件路径 */
  files: string[];
  /** 代码片段 */
  codeSnippets: Array<{ filePath: string; content: string; startLine: number }>;
  /** 上游 Agent 的输出 */
  upstreamOutputs: Array<{ role: AgentRole; output: string }>;
  /** 额外信息 */
  metadata: Record<string, unknown>;
}

/** Agent 产出的事件（用 AsyncGenerator yield） */
export type AgentEvent =
  | { type: "status_change"; status: AgentStatus }
  | { type: "progress"; progress: number; message: string }
  | { type: "output_delta"; delta: string }
  | { type: "output_complete"; fullOutput: string }
  | { type: "error"; error: string; recoverable: boolean }
  | { type: "gank_request"; reason: string; preferredHelper?: AgentRole }
  | { type: "message"; message: AgentMessage }
  | { type: "task_complete"; result: TaskResult };

/** 任务结果 */
export interface TaskResult {
  taskId: string;
  success: boolean;
  output: string;
  /** Coder 产出的代码 diff */
  codeDiff?: string;
  /** Guardian 的审查意见 */
  reviewComments?: ReviewComment[];
  /** Builder 的构建结果 */
  buildLog?: string;
  /** Scout 的搜索结果 */
  searchResults?: SearchResult[];
  /** Token 消耗 */
  tokenUsage: { input: number; output: number };
}

/** 审查意见 */
export interface ReviewComment {
  severity: "info" | "warning" | "error" | "critical";
  filePath: string;
  line?: number;
  message: string;
  suggestion?: string;
}

/** 搜索结果 */
export interface SearchResult {
  filePath: string;
  content: string;
  relevance: number;
  startLine: number;
  endLine: number;
}

/** LLM 消息格式 */
export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Token 使用量 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/** 对局统计 */
export interface SessionStats {
  kills: number;     // 完成的子任务数
  deaths: number;    // 失败/回滚次数
  assists: number;   // Agent 间协作次数
  mvp: AgentRole;
  duration: number;  // 毫秒
  totalTokens: number;
  agentTokens: Record<AgentRole, number>;
}

// ─── MessageBus 接口（避免循环依赖） ──────────────────────────────

export interface IMessageBus {
  emit(event: string, data: unknown): void;
  on(event: string, handler: (data: unknown) => void): void;
  off(event: string, handler: (data: unknown) => void): void;
  send(message: AgentMessage): void;
}

// ─── LLM Adapter 接口 ────────────────────────────────────────────

export interface ILLMAdapter {
  chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse>;
  chatStream(messages: LLMMessage[], options?: LLMRequestOptions): AsyncGenerator<LLMStreamChunk>;
}

export interface LLMRequestOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface LLMResponse {
  content: string;
  usage: TokenUsage;
  stopReason: string | null;
}

export interface LLMStreamChunk {
  type: "content_delta" | "usage" | "stop";
  delta?: string;
  usage?: TokenUsage;
  stopReason?: string;
}

// ─── 模型配置 ──────────────────────────────────────────────────

/** 各角色对应的模型 */
export const MODEL_ASSIGNMENTS: Record<AgentRole, string> = {
  router: "claude-opus-4-20250514",
  coder: "claude-opus-4-20250514",
  guardian: "claude-opus-4-20250514",
  builder: "claude-sonnet-4-20250514",
  scout: "claude-sonnet-4-20250514",
};

/** 角色显示名称 */
export const ROLE_DISPLAY_NAMES: Record<AgentRole, { cn: string; en: string; emoji: string; title: string }> = {
  router:   { cn: "打野",   en: "Router",   emoji: "🌲", title: "影·打野" },
  coder:    { cn: "中路",   en: "Coder",    emoji: "🗡️", title: "咒·法师" },
  guardian: { cn: "对抗路", en: "Guardian", emoji: "🛡️", title: "盾·战士" },
  builder:  { cn: "发育路", en: "Builder",  emoji: "🏹", title: "弓·射手" },
  scout:    { cn: "辅助",   en: "Scout",    emoji: "💫", title: "灵·辅助" },
};

// ─── BaseAgent 抽象类 ────────────────────────────────────────────

export abstract class BaseAgent extends EventEmitter {
  protected state: AgentState;
  protected llm: ILLMAdapter;
  protected bus: IMessageBus;
  protected abortController: AbortController | null = null;

  constructor(
    role: AgentRole,
    llm: ILLMAdapter,
    bus: IMessageBus,
    tokenBudget: number = Infinity,
  ) {
    super();
    this.llm = llm;
    this.bus = bus;
    this.state = {
      role,
      status: "idle",
      currentTask: null,
      progress: 0,
      tokenUsed: 0,
      tokenBudget,
      output: "",
      startTime: null,
      error: null,
      retryCount: 0,
    };

    // 监听发给自己的消息
    this.bus.on(`message:${role}`, (data) => {
      this.onMessage(data as AgentMessage);
    });
  }

  /** 获取当前角色 */
  get role(): AgentRole {
    return this.state.role;
  }

  /** 获取状态快照（只读） */
  getState(): Readonly<AgentState> {
    return { ...this.state };
  }

  /** 获取角色对应的默认模型 */
  protected getModel(): string {
    return MODEL_ASSIGNMENTS[this.state.role];
  }

  // ─── 核心抽象方法：子类必须实现 ──────────────────────────────

  /**
   * 执行任务 — 核心方法
   * 以 AsyncGenerator 模式 yield 事件，供 Orchestrator 消费
   */
  abstract execute(task: Task, context: TaskContext): AsyncGenerator<AgentEvent>;

  /**
   * 获取此 Agent 的 System Prompt
   */
  abstract getSystemPrompt(): string;

  // ─── 状态管理 ────────────────────────────────────────────────

  /** 更新状态并通知 */
  protected setState(patch: Partial<AgentState>): void {
    const prevStatus = this.state.status;
    Object.assign(this.state, patch);

    // 发射状态变更事件
    this.bus.emit("agent:state_change", {
      role: this.state.role,
      prevStatus,
      state: { ...this.state },
    });

    // 本地 EventEmitter 也发射
    this.emit("state_change", this.state);
  }

  /** 转换到工作状态 */
  protected startWorking(taskDescription: string): void {
    this.setState({
      status: "working",
      currentTask: taskDescription,
      progress: 0,
      output: "",
      startTime: Date.now(),
      error: null,
    });
  }

  /** 更新进度 */
  protected updateProgress(progress: number, message?: string): void {
    this.setState({ progress: Math.min(100, Math.max(0, progress)) });
    if (message) {
      this.bus.emit("agent:progress", {
        role: this.state.role,
        progress,
        message,
      });
    }
  }

  /** 追加输出 */
  protected appendOutput(delta: string): void {
    this.state.output += delta;
    this.bus.emit("agent:output_delta", {
      role: this.state.role,
      delta,
      fullOutput: this.state.output,
    });
  }

  /** 标记完成 */
  protected markDone(output?: string): void {
    if (output !== undefined) {
      this.state.output = output;
    }
    this.setState({
      status: "done",
      progress: 100,
    });
  }

  /** 标记错误 */
  protected markError(error: string): void {
    this.state.retryCount++;
    this.setState({
      status: "blocked",
      error,
    });
  }

  /** 重置到空闲 */
  reset(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.setState({
      status: "idle",
      currentTask: null,
      progress: 0,
      output: "",
      startTime: null,
      error: null,
      retryCount: 0,
    });
  }

  /** 取消当前执行 */
  cancel(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.setState({
      status: "idle",
      error: "Cancelled by user",
    });
  }

  // ─── Token 追踪 ─────────────────────────────────────────────

  /** 追踪 Token 消耗 */
  protected trackTokens(usage: TokenUsage): void {
    this.state.tokenUsed += usage.inputTokens + usage.outputTokens;
    this.bus.emit("agent:token_usage", {
      role: this.state.role,
      usage,
      totalUsed: this.state.tokenUsed,
      budget: this.state.tokenBudget,
    });

    // 预算警告（90% 阈值）
    if (
      this.state.tokenBudget !== Infinity &&
      this.state.tokenUsed >= this.state.tokenBudget * 0.9
    ) {
      this.bus.emit("agent:budget_warning", {
        role: this.state.role,
        used: this.state.tokenUsed,
        budget: this.state.tokenBudget,
      });
    }
  }

  // ─── 通信 ────────────────────────────────────────────────────

  /** 发送消息给另一个 Agent */
  protected sendMessage(
    to: AgentRole | "broadcast",
    type: AgentMessageType,
    payload: unknown,
  ): void {
    const message: AgentMessage = {
      id: `${this.state.role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from: this.state.role,
      to,
      type,
      payload,
      timestamp: Date.now(),
    };
    this.bus.send(message);
  }

  /** 请求支援（Gank） */
  protected requestGank(reason: string, preferredHelper?: AgentRole): void {
    this.setState({ status: "blocked" });
    this.sendMessage("router", "gank_request", {
      reason,
      preferredHelper,
      currentTask: this.state.currentTask,
      retryCount: this.state.retryCount,
    });
  }

  /** 收到消息的处理（子类可覆写） */
  protected onMessage(message: AgentMessage): void {
    // 默认不做任何事，子类按需覆写
    this.emit("message", message);
  }

  // ─── LLM 调用辅助 ───────────────────────────────────────────

  /** 调用 LLM（非 streaming） */
  protected async callLLM(
    userPrompt: string,
    options?: LLMRequestOptions,
  ): Promise<{ content: string; usage: TokenUsage }> {
    const messages: LLMMessage[] = [
      { role: "system", content: this.getSystemPrompt() },
      { role: "user", content: userPrompt },
    ];

    const response = await this.llm.chat(messages, {
      model: this.getModel(),
      ...options,
    });

    this.trackTokens(response.usage);
    return { content: response.content, usage: response.usage };
  }

  /** 调用 LLM（streaming），yield 每个 delta */
  protected async *callLLMStream(
    userPrompt: string,
    options?: LLMRequestOptions,
  ): AsyncGenerator<string> {
    const messages: LLMMessage[] = [
      { role: "system", content: this.getSystemPrompt() },
      { role: "user", content: userPrompt },
    ];

    const stream = this.llm.chatStream(messages, {
      model: this.getModel(),
      ...options,
    });

    let totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

    for await (const chunk of stream) {
      if (chunk.type === "content_delta" && chunk.delta) {
        yield chunk.delta;
      } else if (chunk.type === "usage" && chunk.usage) {
        totalUsage = chunk.usage;
      }
    }

    this.trackTokens(totalUsage);
  }

  /** 多轮对话调用 LLM */
  protected async callLLMMultiTurn(
    conversationMessages: LLMMessage[],
    options?: LLMRequestOptions,
  ): Promise<{ content: string; usage: TokenUsage }> {
    const messages: LLMMessage[] = [
      { role: "system", content: this.getSystemPrompt() },
      ...conversationMessages,
    ];

    const response = await this.llm.chat(messages, {
      model: this.getModel(),
      ...options,
    });

    this.trackTokens(response.usage);
    return { content: response.content, usage: response.usage };
  }
}
