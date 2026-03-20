/**
 * Coder Agent — 中路法师（核心输出）
 *
 * 职责：
 * 1. 编写核心业务逻辑
 * 2. 修 Bug
 * 3. 重构代码
 * 4. 根据 Guardian 的 Review 意见迭代修改
 *
 * 模型：Opus 4.6 — 编码质量不妥协
 */

import {
  BaseAgent,
  type AgentEvent,
  type AgentMessage,
  type ILLMAdapter,
  type IMessageBus,
  type LLMMessage,
  type ReviewComment,
  type Task,
  type TaskContext,
} from "./base-agent.js";

export class CoderAgent extends BaseAgent {
  /** 当前代码 diff（供 Guardian 审查） */
  private currentDiff: string = "";
  /** Guardian 的审查意见历史 */
  private reviewHistory: ReviewComment[][] = [];

  constructor(llm: ILLMAdapter, bus: IMessageBus, tokenBudget?: number) {
    super("coder", llm, bus, tokenBudget);
  }

  getSystemPrompt(): string {
    return `You are the Coder Agent (中路法师/Mid Laner) in King Agents, the core output of the team.

## Your Role
You are the primary code writer. Your code quality is non-negotiable — you write production-grade code, not quick hacks.

## Principles
1. **Understand before coding**: Read all provided context carefully before writing a single line.
2. **Architecture-aware**: Respect the project's existing patterns, naming conventions, and structure.
3. **Complete implementation**: Don't leave TODOs or placeholder code. Implement fully.
4. **Error handling**: Always handle edge cases and errors properly.
5. **Type safety**: Use proper types, avoid \`any\` unless absolutely necessary.
6. **Testable code**: Write code that can be easily unit tested (dependency injection, pure functions, etc).

## Output Format
When writing code, always output:
1. A brief explanation of your approach
2. The full code changes in diff format:
\`\`\`diff
--- a/path/to/file
+++ b/path/to/file
@@ -line,count +line,count @@
 context line
-removed line
+added line
 context line
\`\`\`
3. A summary of what was changed and why

## When Receiving Review Feedback
If Guardian sends back review comments:
1. Acknowledge each comment
2. Explain your fix for each issue
3. Output the updated diff
4. Never argue — fix first, discuss later

## When Blocked
If you need more context, request a Gank from Scout.
If requirements are ambiguous, request escalation to the user via Router.`;
  }

  /**
   * 核心执行：接收任务，生成代码
   */
  async *execute(task: Task, context: TaskContext): AsyncGenerator<AgentEvent> {
    this.startWorking(task.description);
    yield { type: "status_change", status: "working" };
    yield { type: "progress", progress: 5, message: "Understanding requirements..." };

    try {
      // 构建 prompt
      const prompt = this.buildCodingPrompt(task, context);

      yield { type: "progress", progress: 15, message: "Designing approach..." };

      // Streaming 生成代码
      let fullOutput = "";
      let progressEstimate = 15;

      for await (const delta of this.callLLMStream(prompt)) {
        fullOutput += delta;
        this.appendOutput(delta);
        yield { type: "output_delta", delta };

        // 根据输出长度估计进度
        progressEstimate = Math.min(90, 15 + fullOutput.length / 100);
        this.updateProgress(progressEstimate);
      }

      // 提取 diff
      this.currentDiff = this.extractDiff(fullOutput);

      yield { type: "progress", progress: 95, message: "Code generation complete" };

      // 将代码发送给 Guardian 审查
      if (this.currentDiff) {
        this.sendMessage("guardian", "code", {
          diff: this.currentDiff,
          description: task.description,
          fullOutput,
        });
      }

      // 同时通知 Builder
      this.sendMessage("builder", "code", {
        diff: this.currentDiff,
        description: task.description,
      });

      this.markDone(fullOutput);
      yield {
        type: "task_complete",
        result: {
          taskId: task.id,
          success: true,
          output: fullOutput,
          codeDiff: this.currentDiff,
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
   * 处理 Guardian 的 Review 反馈，迭代修改代码
   */
  async *handleReview(
    reviewComments: ReviewComment[],
    originalTask: Task,
    context: TaskContext,
  ): AsyncGenerator<AgentEvent> {
    this.reviewHistory.push(reviewComments);
    this.startWorking("Addressing review feedback...");
    yield { type: "status_change", status: "working" };
    yield { type: "progress", progress: 10, message: "Reading review comments..." };

    try {
      const reviewSummary = reviewComments
        .map(
          (c, i) =>
            `${i + 1}. [${c.severity.toUpperCase()}] ${c.filePath}${c.line ? `:${c.line}` : ""}: ${c.message}${c.suggestion ? `\n   Suggestion: ${c.suggestion}` : ""}`,
        )
        .join("\n");

      const prompt = `## Review Feedback to Address
${reviewSummary}

## Original Task
${originalTask.description}

## Current Code (Diff)
\`\`\`diff
${this.currentDiff}
\`\`\`

## Context
${this.buildContextString(context)}

Address ALL review comments. For each:
1. Acknowledge the issue
2. Explain your fix
3. Show the updated code

Output the complete updated diff.`;

      let fullOutput = "";
      for await (const delta of this.callLLMStream(prompt)) {
        fullOutput += delta;
        this.appendOutput(delta);
        yield { type: "output_delta", delta };
      }

      // 更新 diff
      const newDiff = this.extractDiff(fullOutput);
      if (newDiff) {
        this.currentDiff = newDiff;
      }

      // 重新发送给 Guardian
      this.sendMessage("guardian", "code", {
        diff: this.currentDiff,
        description: originalTask.description,
        fullOutput,
        isRevision: true,
        reviewRound: this.reviewHistory.length,
      });

      this.markDone(fullOutput);
      yield {
        type: "task_complete",
        result: {
          taskId: originalTask.id,
          success: true,
          output: fullOutput,
          codeDiff: this.currentDiff,
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

    // Guardian 打回代码
    if (message.from === "guardian" && message.type === "review") {
      const payload = message.payload as { comments: ReviewComment[]; approved: boolean };
      if (!payload.approved) {
        this.bus.emit("coder:review_received", {
          comments: payload.comments,
          approved: payload.approved,
        });
      }
    }
  }

  // ─── 辅助方法 ──────────────────────────────────────────────

  private buildCodingPrompt(task: Task, context: TaskContext): string {
    const parts: string[] = [];

    parts.push(`## Task\n${task.description}`);
    parts.push(`## User's Original Request\n${task.userPrompt}`);

    if (context.files.length > 0) {
      parts.push(`## Relevant Files\n${context.files.join("\n")}`);
    }

    if (context.codeSnippets.length > 0) {
      parts.push("## Existing Code Context");
      for (const snippet of context.codeSnippets) {
        parts.push(
          `### ${snippet.filePath} (line ${snippet.startLine})\n\`\`\`\n${snippet.content}\n\`\`\``,
        );
      }
    }

    if (context.upstreamOutputs.length > 0) {
      parts.push("## Context from Other Agents");
      for (const upstream of context.upstreamOutputs) {
        parts.push(`### ${upstream.role}\n${upstream.output}`);
      }
    }

    parts.push(
      "## Instructions\nWrite the complete implementation. Output the full diff. Be thorough and handle edge cases.",
    );

    return parts.join("\n\n");
  }

  private buildContextString(context: TaskContext): string {
    const parts: string[] = [];
    for (const snippet of context.codeSnippets) {
      parts.push(`${snippet.filePath}:\n\`\`\`\n${snippet.content}\n\`\`\``);
    }
    return parts.join("\n\n") || "No additional context.";
  }

  private extractDiff(output: string): string {
    // 匹配 ```diff ... ``` 块
    const diffMatches = output.match(/```diff\s*([\s\S]*?)```/g);
    if (diffMatches) {
      return diffMatches
        .map((m) => m.replace(/```diff\s*/, "").replace(/```$/, "").trim())
        .join("\n");
    }

    // 匹配以 --- 和 +++ 开头的行
    const lines = output.split("\n");
    const diffLines: string[] = [];
    let inDiff = false;

    for (const line of lines) {
      if (line.startsWith("---") || line.startsWith("+++")) {
        inDiff = true;
      }
      if (inDiff) {
        diffLines.push(line);
        if (line === "" && diffLines.length > 2) {
          // diff 块可能结束
          const nextNonEmpty = lines.indexOf(line) + 1;
          if (
            nextNonEmpty < lines.length &&
            !lines[nextNonEmpty].startsWith(" ") &&
            !lines[nextNonEmpty].startsWith("+") &&
            !lines[nextNonEmpty].startsWith("-") &&
            !lines[nextNonEmpty].startsWith("@@") &&
            !lines[nextNonEmpty].startsWith("---") &&
            !lines[nextNonEmpty].startsWith("+++")
          ) {
            inDiff = false;
          }
        }
      }
    }

    return diffLines.join("\n") || output;
  }

  /** 获取当前 diff */
  getCurrentDiff(): string {
    return this.currentDiff;
  }

  /** 获取审查历史 */
  getReviewHistory(): ReviewComment[][] {
    return [...this.reviewHistory];
  }
}
