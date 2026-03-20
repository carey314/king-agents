/**
 * Builder Agent — 发育路射手（交付引擎）
 *
 * 职责：
 * 1. 执行构建命令（build / test / lint）
 * 2. 解析错误日志，格式化输出
 * 3. 依赖管理
 * 4. 部署脚本执行
 *
 * 模型：Sonnet 4.6 — 主要执行命令，需要速度
 * 设计哲学：前期"猥琐发育"，后期出团战核心输出（build artifact）
 */

import {
  BaseAgent,
  type AgentEvent,
  type AgentMessage,
  type ILLMAdapter,
  type IMessageBus,
  type Task,
  type TaskContext,
} from "./base-agent.js";

// ─── Builder 专用类型 ──────────────────────────────────────────

/** 构建命令类型 */
export type BuildCommandType = "build" | "test" | "lint" | "format" | "install" | "deploy" | "custom";

/** 构建命令 */
export interface BuildCommand {
  type: BuildCommandType;
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

/** 构建结果 */
export interface BuildResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  success: boolean;
  errors: BuildError[];
  warnings: BuildWarning[];
}

/** 构建错误 */
export interface BuildError {
  filePath: string;
  line?: number;
  column?: number;
  message: string;
  code?: string;
}

/** 构建警告 */
export interface BuildWarning {
  filePath: string;
  line?: number;
  message: string;
}

/** 命令执行器（由 extension host 注入） */
export interface ICommandExecutor {
  execute(command: string, cwd?: string, env?: Record<string, string>): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }>;
}

// ─── Builder Agent ────────────────────────────────────────────

export class BuilderAgent extends BaseAgent {
  /** 命令执行器 */
  private executor: ICommandExecutor | null = null;
  /** 最近的构建结果 */
  private lastBuildResults: BuildResult[] = [];

  constructor(llm: ILLMAdapter, bus: IMessageBus, tokenBudget?: number) {
    super("builder", llm, bus, tokenBudget);
  }

  /** 设置命令执行器（由 extension host 注入） */
  setCommandExecutor(executor: ICommandExecutor): void {
    this.executor = executor;
  }

  getSystemPrompt(): string {
    return `You are the Builder Agent (发育路射手/Bot Laner) in King Agents, the delivery engine.

## Your Role
You handle builds, tests, linting, and deployment. Like a late-game ADC, you quietly farm early and deliver the final blow (ship the artifact).

## Capabilities
1. **Build Analysis**: Determine what build commands to run based on the project type
2. **Error Parsing**: Parse build/test output to extract structured errors
3. **Fix Suggestions**: Suggest how to fix build errors
4. **Dependency Management**: Identify missing or incompatible dependencies

## Project Type Detection
Detect project type from config files:
- package.json → Node.js/TypeScript (npm/yarn/pnpm)
- Cargo.toml → Rust (cargo)
- go.mod → Go (go)
- pyproject.toml/requirements.txt → Python (pip/poetry)
- pom.xml → Java (maven)
- Makefile → Make

## Output Format
When analyzing build requirements, output JSON:
\`\`\`json
{
  "projectType": "nodejs",
  "commands": [
    {
      "type": "install|build|test|lint",
      "command": "npm run build",
      "cwd": "./",
      "timeout": 60000
    }
  ]
}
\`\`\`

When analyzing build output, output JSON:
\`\`\`json
{
  "success": true/false,
  "errors": [
    {
      "filePath": "src/index.ts",
      "line": 42,
      "column": 10,
      "message": "Type error: ...",
      "code": "TS2345"
    }
  ],
  "warnings": [],
  "summary": "Build succeeded with 0 errors and 2 warnings",
  "fixSuggestions": ["Install missing @types/node package"]
}
\`\`\``;
  }

  /**
   * 核心执行：分析项目 → 确定构建命令 → 执行 → 解析结果
   */
  async *execute(task: Task, context: TaskContext): AsyncGenerator<AgentEvent> {
    this.startWorking(task.description);
    yield { type: "status_change", status: "working" };
    yield { type: "progress", progress: 5, message: "Analyzing project structure..." };

    try {
      // 第一步：分析项目，确定需要执行的命令
      const analysisPrompt = this.buildAnalysisPrompt(task, context);
      const { content: analysisOutput } = await this.callLLM(analysisPrompt);
      this.appendOutput(analysisOutput + "\n\n");
      yield { type: "output_delta", delta: analysisOutput + "\n\n" };

      yield { type: "progress", progress: 20, message: "Determining build commands..." };

      // 解析构建命令
      const commands = this.parseCommands(analysisOutput);

      // 第二步：执行命令
      const results: BuildResult[] = [];
      const commandCount = commands.length;

      for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        const progressBase = 20 + (60 * i) / commandCount;

        yield {
          type: "progress",
          progress: progressBase,
          message: `Running: ${cmd.command}`,
        };

        const statusMsg = `\n--- Executing: ${cmd.command} ---\n`;
        this.appendOutput(statusMsg);
        yield { type: "output_delta", delta: statusMsg };

        const result = await this.executeCommand(cmd);
        results.push(result);

        // 输出命令结果
        const resultMsg = this.formatBuildResult(result);
        this.appendOutput(resultMsg);
        yield { type: "output_delta", delta: resultMsg };

        // 如果命令失败，分析错误
        if (!result.success) {
          yield {
            type: "progress",
            progress: progressBase + 10,
            message: "Analyzing build errors...",
          };

          const errorAnalysis = await this.analyzeBuildErrors(result);
          this.appendOutput(errorAnalysis);
          yield { type: "output_delta", delta: errorAnalysis };
        }
      }

      this.lastBuildResults = results;

      yield { type: "progress", progress: 90, message: "Summarizing results..." };

      // 通知 Router 构建结果
      const allSuccess = results.every((r) => r.success);
      this.sendMessage("router", "build_result", {
        success: allSuccess,
        results: results.map((r) => ({
          command: r.command,
          success: r.success,
          errorCount: r.errors.length,
          warningCount: r.warnings.length,
        })),
      });

      const fullOutput = this.state.output;
      this.markDone(fullOutput);
      yield {
        type: "task_complete",
        result: {
          taskId: task.id,
          success: allSuccess,
          output: fullOutput,
          buildLog: fullOutput,
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

    // Coder 提交代码后触发构建
    if (message.from === "coder" && message.type === "code") {
      this.bus.emit("builder:code_received", {
        diff: (message.payload as Record<string, unknown>).diff,
      });
    }
  }

  // ─── 辅助方法 ──────────────────────────────────────────────

  private buildAnalysisPrompt(task: Task, context: TaskContext): string {
    const parts: string[] = [];

    parts.push(`## Task\n${task.description}`);

    if (context.files.length > 0) {
      parts.push(`## Project Files\n${context.files.join("\n")}`);
    }

    if (context.codeSnippets.length > 0) {
      parts.push("## Configuration Files");
      for (const snippet of context.codeSnippets) {
        parts.push(
          `### ${snippet.filePath}\n\`\`\`\n${snippet.content}\n\`\`\``,
        );
      }
    }

    parts.push(
      "## Instructions\nAnalyze the project and determine the build commands needed. Consider the project type, existing scripts, and the current task.",
    );

    return parts.join("\n\n");
  }

  private parseCommands(analysisOutput: string): BuildCommand[] {
    const jsonMatch = analysisOutput.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]) as { commands: BuildCommand[] };
        return parsed.commands || [];
      } catch {
        // 解析失败
      }
    }

    // 默认命令
    return [
      { type: "build", command: "npm run build", timeout: 120000 },
      { type: "test", command: "npm test", timeout: 120000 },
    ];
  }

  private async executeCommand(cmd: BuildCommand): Promise<BuildResult> {
    const startTime = Date.now();

    if (!this.executor) {
      // 没有命令执行器，返回模拟结果
      return {
        command: cmd.command,
        exitCode: 0,
        stdout: `[Simulated] Would execute: ${cmd.command}`,
        stderr: "",
        duration: 0,
        success: true,
        errors: [],
        warnings: [],
      };
    }

    try {
      const result = await this.executor.execute(
        cmd.command,
        cmd.cwd,
        cmd.env,
      );

      const duration = Date.now() - startTime;
      const errors = this.parseErrors(result.stderr + result.stdout);
      const warnings = this.parseWarnings(result.stderr + result.stdout);

      return {
        command: cmd.command,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        duration,
        success: result.exitCode === 0,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        command: cmd.command,
        exitCode: 1,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        success: false,
        errors: [
          {
            filePath: "unknown",
            message: error instanceof Error ? error.message : String(error),
          },
        ],
        warnings: [],
      };
    }
  }

  private parseErrors(output: string): BuildError[] {
    const errors: BuildError[] = [];
    const lines = output.split("\n");

    for (const line of lines) {
      // TypeScript 错误格式: file(line,col): error TS1234: message
      const tsMatch = line.match(/(.+?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)/);
      if (tsMatch) {
        errors.push({
          filePath: tsMatch[1],
          line: parseInt(tsMatch[2]),
          column: parseInt(tsMatch[3]),
          code: tsMatch[4],
          message: tsMatch[5],
        });
        continue;
      }

      // ESLint 格式: file:line:col: error message
      const eslintMatch = line.match(/(.+?):(\d+):(\d+):\s*error\s+(.+)/);
      if (eslintMatch) {
        errors.push({
          filePath: eslintMatch[1],
          line: parseInt(eslintMatch[2]),
          column: parseInt(eslintMatch[3]),
          message: eslintMatch[4],
        });
        continue;
      }

      // Generic error
      const genericMatch = line.match(/error[:\s]+(.+)/i);
      if (genericMatch && !line.includes("0 errors")) {
        errors.push({
          filePath: "unknown",
          message: genericMatch[1],
        });
      }
    }

    return errors;
  }

  private parseWarnings(output: string): BuildWarning[] {
    const warnings: BuildWarning[] = [];
    const lines = output.split("\n");

    for (const line of lines) {
      const warnMatch = line.match(/(.+?):(\d+):\d+:\s*warning\s+(.+)/);
      if (warnMatch) {
        warnings.push({
          filePath: warnMatch[1],
          line: parseInt(warnMatch[2]),
          message: warnMatch[3],
        });
      }
    }

    return warnings;
  }

  private formatBuildResult(result: BuildResult): string {
    const parts: string[] = [];
    const status = result.success ? "SUCCESS" : "FAILED";
    parts.push(`[${status}] ${result.command} (${result.duration}ms, exit code: ${result.exitCode})`);

    if (result.stdout) {
      parts.push(`stdout:\n${result.stdout.slice(0, 2000)}`);
    }
    if (result.stderr) {
      parts.push(`stderr:\n${result.stderr.slice(0, 2000)}`);
    }
    if (result.errors.length > 0) {
      parts.push(
        `Errors (${result.errors.length}):\n` +
          result.errors
            .map((e) => `  ${e.filePath}${e.line ? `:${e.line}` : ""}: ${e.message}`)
            .join("\n"),
      );
    }
    if (result.warnings.length > 0) {
      parts.push(
        `Warnings (${result.warnings.length}):\n` +
          result.warnings
            .map((w) => `  ${w.filePath}${w.line ? `:${w.line}` : ""}: ${w.message}`)
            .join("\n"),
      );
    }

    return parts.join("\n") + "\n";
  }

  private async analyzeBuildErrors(result: BuildResult): Promise<string> {
    const prompt = `Analyze these build errors and suggest fixes:

## Command
${result.command}

## Errors
${result.errors.map((e) => `- ${e.filePath}${e.line ? `:${e.line}` : ""}: ${e.message}`).join("\n")}

## Full Output
${(result.stderr + result.stdout).slice(0, 4000)}

Provide a brief analysis and actionable fix suggestions.`;

    const { content } = await this.callLLM(prompt);
    return `\n--- Error Analysis ---\n${content}\n`;
  }

  /** 获取最近构建结果 */
  getLastBuildResults(): BuildResult[] {
    return [...this.lastBuildResults];
  }
}
