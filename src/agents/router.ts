/**
 * Router Agent — 打野（节奏核心）
 *
 * 职责：
 * 1. 接收用户指令，进行意图识别
 * 2. 任务拆解：大任务拆成可并行的子任务
 * 3. 分配给各路 Agent
 * 4. Gank 决策：某路卡住时调配支援
 * 5. 节奏控制：前期(分析) → 中期(开发) → 后期(集成)
 *
 * 模型：Opus 4.6 — 调度需要最强理解力和推理力
 */

import {
  BaseAgent,
  type AgentEvent,
  type AgentMessage,
  type AgentRole,
  type ILLMAdapter,
  type IMessageBus,
  type LLMMessage,
  type Task,
  type TaskContext,
} from "./base-agent.js";

// ─── Router 专用类型 ──────────────────────────────────────────

/** 意图类型 */
export type IntentType = "feature" | "bugfix" | "refactor" | "question" | "review" | "build";

/** Router 拆解出的任务计划 */
export interface TaskPlan {
  intent: IntentType;
  summary: string;
  tasks: PlannedTask[];
  /** 执行策略：串行 or 并行 */
  executionOrder: ExecutionStep[];
}

/** 计划中的单个任务 */
export interface PlannedTask {
  id: string;
  assignee: AgentRole;
  description: string;
  dependencies: string[];
  context: string;
  priority: number;
}

/** 执行步骤（可包含并行任务） */
export interface ExecutionStep {
  /** 并行执行的任务 ID 列表 */
  parallel: string[];
}

/** Gank 决策 */
export interface GankDecision {
  action: "gank" | "teamfight" | "escalate" | "retry";
  helper?: AgentRole;
  participants?: AgentRole[];
  reason: string;
  newTask?: string;
}

// ─── Router Agent ─────────────────────────────────────────────

export class RouterAgent extends BaseAgent {
  /** 当前任务计划 */
  private currentPlan: TaskPlan | null = null;
  /** Gank 请求队列 */
  private gankQueue: Array<{ from: AgentRole; reason: string }> = [];

  constructor(llm: ILLMAdapter, bus: IMessageBus, tokenBudget?: number) {
    super("router", llm, bus, tokenBudget);

    // 监听 Gank 请求
    this.bus.on("gank:request", (data) => {
      const req = data as { from: AgentRole; reason: string };
      this.gankQueue.push(req);
    });
  }

  getSystemPrompt(): string {
    return `You are the Router Agent (打野/Jungler) in King Agents, a multi-agent coding team.

Your role is the tactical core — you receive user instructions, understand intent, decompose tasks, and coordinate the team.

## Your Team
- Coder (中路/Mid): Writes core code. Strongest at implementation.
- Guardian (对抗路/Top): Code review + test generation. Has VETO power.
- Builder (发育路/Bot): Runs builds, tests, deploys. Focused on delivery.
- Scout (辅助/Support): Code search, context gathering. Provides vision.

## Your Responsibilities
1. **Intent Recognition**: Classify the request as: feature, bugfix, refactor, question, review, or build.
2. **Task Decomposition**: Break complex requests into sub-tasks assigned to specific agents.
3. **Execution Planning**: Determine which tasks can run in parallel vs must be sequential.
4. **Context Packaging**: Specify what context each agent needs (no noise, only relevant info).
5. **Gank Decisions**: When an agent is blocked, decide how to help.

## Output Format
Always respond with a JSON task plan:
\`\`\`json
{
  "intent": "feature|bugfix|refactor|question|review|build",
  "summary": "Brief description of the overall task",
  "tasks": [
    {
      "id": "task_1",
      "assignee": "scout|coder|guardian|builder",
      "description": "What this agent should do",
      "dependencies": [],
      "context": "What context this agent needs",
      "priority": 8
    }
  ],
  "executionOrder": [
    { "parallel": ["task_1"] },
    { "parallel": ["task_2"] },
    { "parallel": ["task_3", "task_4"] }
  ]
}
\`\`\`

## Principles
- Scout goes first to gather context (like warding before a fight)
- Coder works after Scout provides vision
- Guardian and Builder can often run in parallel after Coder finishes
- For simple questions, you can answer directly without involving others
- Always prefer parallel execution when dependencies allow
- Max 3 retries before escalating to the user`;
  }

  /**
   * 执行任务：分析用户输入，生成任务计划
   */
  async *execute(task: Task, context: TaskContext): AsyncGenerator<AgentEvent> {
    this.startWorking("Analyzing user request and planning...");
    yield { type: "status_change", status: "working" };
    yield { type: "progress", progress: 10, message: "Understanding intent..." };

    try {
      // 构建 prompt，包含项目上下文
      const contextInfo = this.buildContextInfo(context);
      const userPrompt = `## User Request
${task.userPrompt}

## Current Project Context
${contextInfo}

Analyze this request and create a detailed task plan. Consider:
1. What is the user's intent?
2. What sub-tasks are needed?
3. Which agents should handle each sub-task?
4. What is the optimal execution order?
5. What specific context does each agent need?`;

      // Streaming 调用 LLM
      let fullOutput = "";
      for await (const delta of this.callLLMStream(userPrompt)) {
        fullOutput += delta;
        this.appendOutput(delta);
        yield { type: "output_delta", delta };
      }

      yield { type: "progress", progress: 60, message: "Parsing task plan..." };

      // 解析 JSON 任务计划
      const plan = this.parseTaskPlan(fullOutput);
      this.currentPlan = plan;

      yield { type: "progress", progress: 80, message: "Distributing tasks..." };

      // 向各 Agent 分配任务
      for (const plannedTask of plan.tasks) {
        this.sendMessage(plannedTask.assignee, "task_assign", {
          task: plannedTask,
          plan: {
            intent: plan.intent,
            summary: plan.summary,
            executionOrder: plan.executionOrder,
          },
        });
      }

      yield { type: "progress", progress: 100, message: "Plan distributed!" };
      this.markDone(fullOutput);
      yield {
        type: "task_complete",
        result: {
          taskId: task.id,
          success: true,
          output: fullOutput,
          tokenUsage: { input: 0, output: 0 },
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.markError(errorMsg);
      yield { type: "error", error: errorMsg, recoverable: true };
    }
  }

  /**
   * Gank 决策：某路 Agent 被阻塞时的支援策略
   */
  async makeGankDecision(
    blockedAgent: AgentRole,
    reason: string,
    retryCount: number,
  ): Promise<GankDecision> {
    // 超过重试上限，升级给用户
    if (retryCount > 2) {
      return {
        action: "escalate",
        reason: `${blockedAgent} has failed ${retryCount} times: ${reason}`,
      };
    }

    const prompt = `An agent is blocked and needs help. Make a gank decision.

## Blocked Agent
- Role: ${blockedAgent}
- Reason: ${reason}
- Retry count: ${retryCount}

## Available Actions
1. **gank**: Send a helper agent to assist
2. **teamfight**: Multiple agents collaborate to solve
3. **escalate**: Ask the user for clarification
4. **retry**: Have the blocked agent try again with adjusted approach

## Gank Strategies
- Coder blocked by missing context → Send Scout to search more
- Coder blocked by ambiguous requirements → Escalate to user
- Guardian found critical issue → Teamfight (Coder + Guardian + Scout)
- Builder failed → Retry with adjusted commands, or Scout to check config
- Scout found nothing → Retry with broader search, or escalate

Respond with JSON:
\`\`\`json
{
  "action": "gank|teamfight|escalate|retry",
  "helper": "agent_role (for gank)",
  "participants": ["roles (for teamfight)"],
  "reason": "explanation",
  "newTask": "adjusted task description if any"
}
\`\`\``;

    const { content } = await this.callLLM(prompt);
    return this.parseGankDecision(content);
  }

  /**
   * 汇总所有 Agent 结果，生成最终输出
   */
  async *summarizeResults(
    results: Map<AgentRole, string>,
    originalTask: Task,
  ): AsyncGenerator<AgentEvent> {
    this.startWorking("Summarizing results...");
    yield { type: "status_change", status: "working" };

    const resultsSummary = Array.from(results.entries())
      .map(([role, output]) => `### ${role}\n${output}`)
      .join("\n\n");

    const prompt = `## Original Request
${originalTask.userPrompt}

## Agent Results
${resultsSummary}

Summarize the results for the user. Include:
1. What was accomplished
2. Key decisions made
3. Any files changed
4. Any issues found and resolved
5. Suggestions for next steps`;

    let fullOutput = "";
    for await (const delta of this.callLLMStream(prompt)) {
      fullOutput += delta;
      this.appendOutput(delta);
      yield { type: "output_delta", delta };
    }

    this.markDone(fullOutput);
    yield {
      type: "task_complete",
      result: {
        taskId: originalTask.id,
        success: true,
        output: fullOutput,
        tokenUsage: { input: 0, output: 0 },
      },
    };
  }

  // ─── 消息处理 ──────────────────────────────────────────────

  protected override onMessage(message: AgentMessage): void {
    super.onMessage(message);

    if (message.type === "gank_request") {
      const payload = message.payload as { reason: string };
      this.gankQueue.push({ from: message.from, reason: payload.reason });
    }
  }

  // ─── 内部辅助方法 ────────────────────────────────────────────

  private buildContextInfo(context: TaskContext): string {
    const parts: string[] = [];

    if (context.files.length > 0) {
      parts.push(`**Related files**: ${context.files.join(", ")}`);
    }

    if (context.codeSnippets.length > 0) {
      for (const snippet of context.codeSnippets) {
        parts.push(`**${snippet.filePath}** (line ${snippet.startLine}):\n\`\`\`\n${snippet.content}\n\`\`\``);
      }
    }

    if (context.upstreamOutputs.length > 0) {
      for (const upstream of context.upstreamOutputs) {
        parts.push(`**${upstream.role} output**:\n${upstream.output}`);
      }
    }

    return parts.length > 0 ? parts.join("\n\n") : "No prior context available.";
  }

  private parseTaskPlan(llmOutput: string): TaskPlan {
    // 提取 JSON 块
    const jsonMatch = llmOutput.match(/```json\s*([\s\S]*?)```/);
    if (!jsonMatch) {
      // 尝试直接解析
      try {
        return JSON.parse(llmOutput) as TaskPlan;
      } catch {
        // 构造一个默认计划
        return {
          intent: "feature",
          summary: "Task plan could not be parsed, using default flow",
          tasks: [
            {
              id: "task_scout",
              assignee: "scout",
              description: "Search for relevant code and context",
              dependencies: [],
              context: llmOutput,
              priority: 8,
            },
            {
              id: "task_coder",
              assignee: "coder",
              description: "Implement the requested changes",
              dependencies: ["task_scout"],
              context: llmOutput,
              priority: 10,
            },
          ],
          executionOrder: [
            { parallel: ["task_scout"] },
            { parallel: ["task_coder"] },
          ],
        };
      }
    }

    try {
      return JSON.parse(jsonMatch[1]) as TaskPlan;
    } catch {
      throw new Error("Failed to parse task plan JSON from LLM output");
    }
  }

  private parseGankDecision(llmOutput: string): GankDecision {
    const jsonMatch = llmOutput.match(/```json\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : llmOutput;

    try {
      return JSON.parse(jsonStr) as GankDecision;
    } catch {
      // 默认：重试
      return {
        action: "retry",
        reason: "Could not parse gank decision, defaulting to retry",
      };
    }
  }

  /** 获取当前计划 */
  getPlan(): TaskPlan | null {
    return this.currentPlan;
  }

  /** 获取 Gank 队列 */
  getGankQueue(): Array<{ from: AgentRole; reason: string }> {
    return [...this.gankQueue];
  }

  /** 清空 Gank 队列 */
  clearGankQueue(): void {
    this.gankQueue = [];
  }
}
