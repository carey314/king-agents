/**
 * Guardian Agent — 对抗路战士（质量护盾）
 *
 * 职责：
 * 1. Code Review：逻辑错误、边界情况、安全漏洞、代码规范
 * 2. 测试生成：根据变更自动生成单元测试
 * 3. 否决权：可以打回 Coder 的代码
 * 4. 发现严重问题时，通知 Router 发起"团战"
 *
 * 模型：Opus 4.6 — 审查需要最强推理力才能找到深层 bug
 */

import {
  BaseAgent,
  type AgentEvent,
  type AgentMessage,
  type ILLMAdapter,
  type IMessageBus,
  type ReviewComment,
  type Task,
  type TaskContext,
} from "./base-agent.js";

// ─── Guardian 专用类型 ─────────────────────────────────────────

/** 审查结果 */
export interface ReviewResult {
  approved: boolean;
  comments: ReviewComment[];
  testCode?: string;
  securityIssues: SecurityIssue[];
  overallScore: number; // 0-10
  summary: string;
}

/** 安全问题 */
export interface SecurityIssue {
  type: "injection" | "xss" | "auth" | "data_exposure" | "other";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  filePath: string;
  line?: number;
}

// ─── Guardian Agent ───────────────────────────────────────────

export class GuardianAgent extends BaseAgent {
  /** 审查轮次计数器 */
  private reviewRound: number = 0;
  /** 最大审查轮次 */
  private maxReviewRounds: number = 3;

  constructor(llm: ILLMAdapter, bus: IMessageBus, tokenBudget?: number) {
    super("guardian", llm, bus, tokenBudget);
  }

  getSystemPrompt(): string {
    return `You are the Guardian Agent (对抗路战士/Top Laner) in King Agents, the quality shield of the team.

## Your Role
You are the code reviewer, test writer, and security auditor. You have VETO power — you can reject code that doesn't meet standards.

## Review Criteria
1. **Correctness**: Does the code do what it's supposed to?
2. **Edge Cases**: Are all boundary conditions handled?
3. **Security**: Any injection, XSS, auth bypass, data exposure risks?
4. **Performance**: Any obvious performance issues (N+1 queries, memory leaks)?
5. **Code Quality**: Naming, structure, readability, DRY principle
6. **Type Safety**: Proper types, no unsafe casts, no \`any\` abuse
7. **Error Handling**: Are errors properly caught, logged, and handled?
8. **Testability**: Can this code be unit tested?

## Output Format
Always respond with JSON:
\`\`\`json
{
  "approved": true/false,
  "overallScore": 8,
  "summary": "Brief review summary",
  "comments": [
    {
      "severity": "info|warning|error|critical",
      "filePath": "path/to/file",
      "line": 42,
      "message": "Description of the issue",
      "suggestion": "How to fix it"
    }
  ],
  "securityIssues": [
    {
      "type": "injection|xss|auth|data_exposure|other",
      "severity": "low|medium|high|critical",
      "description": "Description",
      "filePath": "path",
      "line": 10
    }
  ],
  "testCode": "// Generated test code here..."
}
\`\`\`

## Veto Rules
- APPROVE if: score >= 7 and no critical/error issues
- REJECT if: score < 7, or any critical issue, or any security issue with severity >= high
- When rejecting, provide clear, actionable fix suggestions
- Be firm but fair — don't reject for style preferences alone

## Test Generation
When approved, generate comprehensive unit tests covering:
- Happy path
- Edge cases
- Error scenarios
- Integration points`;
  }

  /**
   * 核心执行：审查代码 + 生成测试
   */
  async *execute(task: Task, context: TaskContext): AsyncGenerator<AgentEvent> {
    this.startWorking(task.description);
    yield { type: "status_change", status: "working" };
    yield { type: "progress", progress: 5, message: "Starting code review..." };

    try {
      const prompt = this.buildReviewPrompt(task, context);

      yield { type: "progress", progress: 20, message: "Analyzing code quality..." };

      // Streaming 审查
      let fullOutput = "";
      for await (const delta of this.callLLMStream(prompt)) {
        fullOutput += delta;
        this.appendOutput(delta);
        yield { type: "output_delta", delta };
      }

      yield { type: "progress", progress: 80, message: "Parsing review results..." };

      // 解析审查结果
      const reviewResult = this.parseReviewResult(fullOutput);
      this.reviewRound++;

      // 根据审查结果决定动作
      if (reviewResult.approved) {
        yield { type: "progress", progress: 90, message: "Code approved! Generating tests..." };

        // 通知 Coder 代码通过
        this.sendMessage("coder", "review", {
          approved: true,
          comments: reviewResult.comments,
          score: reviewResult.overallScore,
        });

        // 通知 Router 审查完成
        this.sendMessage("router", "review", {
          approved: true,
          summary: reviewResult.summary,
          testCode: reviewResult.testCode,
        });
      } else {
        yield { type: "progress", progress: 90, message: "Issues found, rejecting code..." };

        // 检查是否有严重安全问题 → 触发团战
        const hasCritical = reviewResult.securityIssues.some(
          (issue) => issue.severity === "critical",
        );

        if (hasCritical) {
          // 严重问题 → 通知 Router 发起团战
          this.sendMessage("router", "gank_request", {
            reason: "Critical security issue found in code review",
            severity: "critical",
            issues: reviewResult.securityIssues.filter(
              (i) => i.severity === "critical",
            ),
          });
        }

        // 打回 Coder 的代码
        this.sendMessage("coder", "review", {
          approved: false,
          comments: reviewResult.comments,
          score: reviewResult.overallScore,
          securityIssues: reviewResult.securityIssues,
        });
      }

      this.markDone(fullOutput);
      yield {
        type: "task_complete",
        result: {
          taskId: task.id,
          success: true,
          output: fullOutput,
          reviewComments: reviewResult.comments,
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
   * 专门的测试生成模式
   */
  async *generateTests(
    codeDiff: string,
    task: Task,
    context: TaskContext,
  ): AsyncGenerator<AgentEvent> {
    this.startWorking("Generating tests...");
    yield { type: "status_change", status: "working" };

    try {
      const prompt = `## Task
Generate comprehensive unit tests for the following code changes.

## Code Diff
\`\`\`diff
${codeDiff}
\`\`\`

## Original Requirement
${task.description}

## Context
${context.codeSnippets.map((s) => `${s.filePath}:\n\`\`\`\n${s.content}\n\`\`\``).join("\n\n")}

## Instructions
Generate tests that cover:
1. Happy path (normal usage)
2. Edge cases (empty input, null, boundary values)
3. Error scenarios (invalid input, network failures)
4. Integration points (API calls, database operations)

Use the project's existing test framework and patterns. Output complete, runnable test files.`;

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

  // ─── 消息处理 ──────────────────────────────────────────────

  protected override onMessage(message: AgentMessage): void {
    super.onMessage(message);

    // Coder 提交代码来审查
    if (message.from === "coder" && message.type === "code") {
      this.bus.emit("guardian:code_received", {
        diff: (message.payload as Record<string, unknown>).diff,
        isRevision: (message.payload as Record<string, unknown>).isRevision,
      });
    }
  }

  // ─── 辅助方法 ──────────────────────────────────────────────

  private buildReviewPrompt(task: Task, context: TaskContext): string {
    const parts: string[] = [];

    parts.push(`## Review Task\n${task.description}`);

    // 从上游获取 Coder 的 diff
    const coderOutput = context.upstreamOutputs.find((o) => o.role === "coder");
    if (coderOutput) {
      parts.push(`## Code to Review\n${coderOutput.output}`);
    }

    // 完整文件上下文（Guardian 同时看全量文件和 diff）
    if (context.codeSnippets.length > 0) {
      parts.push("## Full File Context");
      for (const snippet of context.codeSnippets) {
        parts.push(
          `### ${snippet.filePath} (line ${snippet.startLine})\n\`\`\`\n${snippet.content}\n\`\`\``,
        );
      }
    }

    if (this.reviewRound > 0) {
      parts.push(
        `## Note\nThis is review round ${this.reviewRound + 1}. The previous code was rejected. Pay extra attention to whether the previous issues were properly fixed.`,
      );
    }

    parts.push(
      "## Instructions\nPerform a thorough code review. Check for correctness, security, performance, and code quality. Generate unit tests if you approve.",
    );

    return parts.join("\n\n");
  }

  private parseReviewResult(llmOutput: string): ReviewResult {
    const jsonMatch = llmOutput.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]) as ReviewResult;
        return {
          approved: parsed.approved ?? false,
          comments: parsed.comments ?? [],
          testCode: parsed.testCode,
          securityIssues: parsed.securityIssues ?? [],
          overallScore: parsed.overallScore ?? 5,
          summary: parsed.summary ?? "Review completed",
        };
      } catch {
        // 解析失败，进入下方默认逻辑
      }
    }

    // 无法解析时，保守地不通过
    return {
      approved: false,
      comments: [
        {
          severity: "warning",
          filePath: "unknown",
          message: "Could not parse review output. Manual review recommended.",
        },
      ],
      securityIssues: [],
      overallScore: 5,
      summary: llmOutput.slice(0, 200),
    };
  }

  /** 获取当前审查轮次 */
  getReviewRound(): number {
    return this.reviewRound;
  }

  /** 重置审查计数器 */
  resetReviewRound(): void {
    this.reviewRound = 0;
  }

  /** 是否超过最大审查轮次 */
  isMaxReviewReached(): boolean {
    return this.reviewRound >= this.maxReviewRounds;
  }
}
