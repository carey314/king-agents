/**
 * Scout Agent — 辅助/视野先锋
 *
 * 职责：
 * 1. 代码搜索（grep / AST 解析）
 * 2. 读取并摘要相关文件
 * 3. 外部文档 / API 文档检索
 * 4. 为其他 Agent 准备 context（"插眼给视野"）
 * 5. 环境信息收集（当前分支、未提交变更等）
 *
 * 模型：Sonnet 4.6 — 搜索摘要需要快速响应，Sonnet 速度/质量最均衡
 */

import {
  BaseAgent,
  type AgentEvent,
  type AgentMessage,
  type AgentRole,
  type ILLMAdapter,
  type IMessageBus,
  type SearchResult,
  type Task,
  type TaskContext,
} from "./base-agent.js";

// ─── Scout 专用类型 ──────────────────────────────────────────

/** 文件系统操作接口（由 extension host 注入） */
export interface IFileSystem {
  /** 读取文件内容 */
  readFile(path: string): Promise<string>;
  /** 列出目录 */
  listDirectory(path: string, recursive?: boolean): Promise<string[]>;
  /** 搜索文件内容（grep） */
  searchContent(query: string, options?: SearchOptions): Promise<FileSearchResult[]>;
  /** 按文件名搜索 */
  searchFiles(pattern: string): Promise<string[]>;
  /** 获取 git 信息 */
  getGitInfo(): Promise<GitInfo>;
}

/** 搜索选项 */
export interface SearchOptions {
  include?: string[];    // glob patterns to include
  exclude?: string[];    // glob patterns to exclude
  maxResults?: number;
  caseSensitive?: boolean;
  regex?: boolean;
}

/** 文件搜索结果 */
export interface FileSearchResult {
  filePath: string;
  matches: Array<{
    line: number;
    content: string;
    matchStart: number;
    matchEnd: number;
  }>;
}

/** Git 信息 */
export interface GitInfo {
  branch: string;
  uncommittedFiles: string[];
  recentCommits: Array<{ hash: string; message: string; date: string }>;
}

/** Scout 搜索计划 */
export interface SearchPlan {
  queries: Array<{
    type: "content" | "filename" | "directory" | "git";
    query: string;
    purpose: string;
  }>;
  filesToRead: string[];
  contextNeeded: string;
}

// ─── Scout Agent ──────────────────────────────────────────────

export class ScoutAgent extends BaseAgent {
  /** 文件系统操作器 */
  private fs: IFileSystem | null = null;
  /** 搜索结果缓存 */
  private searchCache = new Map<string, SearchResult[]>();

  constructor(llm: ILLMAdapter, bus: IMessageBus, tokenBudget?: number) {
    super("scout", llm, bus, tokenBudget);
  }

  /** 设置文件系统操作器 */
  setFileSystem(fs: IFileSystem): void {
    this.fs = fs;
  }

  getSystemPrompt(): string {
    return `You are the Scout Agent (辅助/Support) in King Agents, the vision provider.

## Your Role
You are the team's eyes. Like a support in MOBA, you ward the map (provide context) so others can fight effectively. You search code, read files, and deliver precise context to other agents.

## Capabilities
1. **Code Search**: Find relevant code by content or filename patterns
2. **File Reading**: Read and summarize files
3. **Context Assembly**: Prepare focused context packages for other agents
4. **Git Awareness**: Check branch, uncommitted changes, recent commits
5. **Architecture Analysis**: Understand project structure and patterns

## Principles
- **No truncation**: Return complete code snippets, not summaries
- **Relevance ranking**: Most relevant results first
- **Context precision**: Only include what the requesting agent needs
- **Cache results**: Same search twice should hit cache
- Like warding in MOBA: provide vision BEFORE the team needs it

## Output Format
When planning a search, output JSON:
\`\`\`json
{
  "queries": [
    {
      "type": "content|filename|directory|git",
      "query": "search query or pattern",
      "purpose": "why this search is needed"
    }
  ],
  "filesToRead": ["path/to/important/file.ts"],
  "contextNeeded": "description of what context we need to gather"
}
\`\`\`

When delivering results, output structured context:
\`\`\`json
{
  "summary": "Brief summary of findings",
  "files": [
    {
      "filePath": "src/auth/login.ts",
      "content": "full file content or relevant section",
      "relevance": 9,
      "startLine": 1,
      "endLine": 50
    }
  ],
  "projectStructure": "relevant directory tree",
  "gitStatus": { "branch": "main", "uncommitted": [] },
  "insights": ["This project uses Express.js", "Auth is handled by passport"]
}
\`\`\``;
  }

  /**
   * 核心执行：搜索代码 + 收集上下文
   */
  async *execute(task: Task, context: TaskContext): AsyncGenerator<AgentEvent> {
    this.startWorking(task.description);
    yield { type: "status_change", status: "working" };
    yield { type: "progress", progress: 5, message: "Planning search strategy..." };

    try {
      // 第一步：LLM 分析需要搜索什么
      const planPrompt = `## Task
${task.description}

## User's Original Request
${task.userPrompt}

## Known Files
${context.files.length > 0 ? context.files.join("\n") : "None yet"}

Plan a comprehensive search to gather all context needed for this task. What files should we search for? What code patterns? What project info?`;

      const { content: planOutput } = await this.callLLM(planPrompt);
      this.appendOutput("Search Plan:\n" + planOutput + "\n\n");
      yield { type: "output_delta", delta: "Search Plan:\n" + planOutput + "\n\n" };

      yield { type: "progress", progress: 20, message: "Executing searches..." };

      // 解析搜索计划
      const searchPlan = this.parseSearchPlan(planOutput);

      // 第二步：执行搜索
      const allResults: SearchResult[] = [];
      const totalQueries = searchPlan.queries.length + searchPlan.filesToRead.length;
      let completed = 0;

      // 执行内容搜索
      for (const query of searchPlan.queries) {
        const progress = 20 + (50 * completed) / Math.max(totalQueries, 1);
        yield {
          type: "progress",
          progress,
          message: `Searching: ${query.purpose}`,
        };

        const results = await this.executeSearch(query);
        allResults.push(...results);
        completed++;

        const searchMsg = `Found ${results.length} results for "${query.query}"\n`;
        this.appendOutput(searchMsg);
        yield { type: "output_delta", delta: searchMsg };
      }

      // 读取指定文件
      for (const filePath of searchPlan.filesToRead) {
        const progress = 20 + (50 * completed) / Math.max(totalQueries, 1);
        yield {
          type: "progress",
          progress,
          message: `Reading: ${filePath}`,
        };

        const content = await this.readFile(filePath);
        if (content) {
          allResults.push({
            filePath,
            content,
            relevance: 10,
            startLine: 1,
            endLine: content.split("\n").length,
          });
        }
        completed++;
      }

      yield { type: "progress", progress: 75, message: "Assembling context..." };

      // 第三步：LLM 整理搜索结果为精准上下文
      const assemblePrompt = `## Task
${task.description}

## Raw Search Results
${allResults
  .map((r) => `### ${r.filePath} (relevance: ${r.relevance})\n\`\`\`\n${r.content.slice(0, 3000)}\n\`\`\``)
  .join("\n\n")}

Assemble a focused context package. Include:
1. Summary of findings
2. Most relevant code (complete, not truncated)
3. Project structure insights
4. Key observations for the next agent`;

      let assemblyOutput = "";
      for await (const delta of this.callLLMStream(assemblePrompt)) {
        assemblyOutput += delta;
        this.appendOutput(delta);
        yield { type: "output_delta", delta };
      }

      yield { type: "progress", progress: 95, message: "Delivering context..." };

      // 将上下文发送给需要的 Agent（通常是 Coder）
      this.sendMessage("coder", "context", {
        searchResults: allResults,
        summary: assemblyOutput,
        files: allResults.map((r) => r.filePath),
      });

      // 也通知 Router
      this.sendMessage("router", "context", {
        searchResults: allResults.length,
        summary: assemblyOutput.slice(0, 500),
      });

      this.markDone(this.state.output);
      yield {
        type: "task_complete",
        result: {
          taskId: task.id,
          success: true,
          output: this.state.output,
          searchResults: allResults,
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
   * 快速搜索模式（其他 Agent Gank 请求时使用）
   */
  async *quickSearch(
    query: string,
    requestedBy: AgentRole,
  ): AsyncGenerator<AgentEvent> {
    this.setState({ status: "ganking" });
    yield { type: "status_change", status: "ganking" };

    try {
      // 检查缓存
      const cached = this.searchCache.get(query);
      if (cached) {
        this.sendMessage(requestedBy, "context", {
          searchResults: cached,
          cached: true,
        });
        this.setState({ status: "done" });
        yield {
          type: "task_complete",
          result: {
            taskId: `quick_${Date.now()}`,
            success: true,
            output: `Found ${cached.length} cached results for "${query}"`,
            searchResults: cached,
            tokenUsage: { input: 0, output: 0 },
          },
        };
        return;
      }

      // 直接执行搜索
      const results = await this.executeSearch({
        type: "content",
        query,
        purpose: `Quick search requested by ${requestedBy}`,
      });

      // 缓存结果
      this.searchCache.set(query, results);

      // 发送结果
      this.sendMessage(requestedBy, "context", {
        searchResults: results,
        cached: false,
      });

      this.setState({ status: "done" });
      yield {
        type: "task_complete",
        result: {
          taskId: `quick_${Date.now()}`,
          success: true,
          output: `Found ${results.length} results for "${query}"`,
          searchResults: results,
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

    // 其他 Agent 请求搜索
    if (message.type === "gank_request") {
      const payload = message.payload as { reason: string };
      this.bus.emit("scout:search_requested", {
        from: message.from,
        query: payload.reason,
      });
    }
  }

  // ─── 辅助方法 ──────────────────────────────────────────────

  private parseSearchPlan(llmOutput: string): SearchPlan {
    const jsonMatch = llmOutput.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]) as SearchPlan;
      } catch {
        // 解析失败
      }
    }

    // 默认搜索计划
    return {
      queries: [
        {
          type: "content",
          query: llmOutput.slice(0, 100),
          purpose: "General search based on task description",
        },
      ],
      filesToRead: [],
      contextNeeded: "General project context",
    };
  }

  private async executeSearch(query: {
    type: string;
    query: string;
    purpose: string;
  }): Promise<SearchResult[]> {
    if (!this.fs) {
      // 没有文件系统，返回模拟结果
      return [
        {
          filePath: `simulated/${query.query.replace(/\s+/g, "_")}.ts`,
          content: `// Simulated search result for: ${query.query}\n// (FileSystem not connected)`,
          relevance: 5,
          startLine: 1,
          endLine: 2,
        },
      ];
    }

    const results: SearchResult[] = [];

    try {
      switch (query.type) {
        case "content": {
          const searchResults = await this.fs.searchContent(query.query, {
            maxResults: 20,
          });
          for (const result of searchResults) {
            const content = result.matches
              .map((m) => `L${m.line}: ${m.content}`)
              .join("\n");
            results.push({
              filePath: result.filePath,
              content,
              relevance: Math.min(10, result.matches.length + 3),
              startLine: result.matches[0]?.line ?? 1,
              endLine: result.matches[result.matches.length - 1]?.line ?? 1,
            });
          }
          break;
        }
        case "filename": {
          const files = await this.fs.searchFiles(query.query);
          for (const filePath of files.slice(0, 10)) {
            const content = await this.fs.readFile(filePath);
            results.push({
              filePath,
              content,
              relevance: 7,
              startLine: 1,
              endLine: content.split("\n").length,
            });
          }
          break;
        }
        case "directory": {
          const files = await this.fs.listDirectory(query.query, true);
          results.push({
            filePath: query.query,
            content: files.join("\n"),
            relevance: 5,
            startLine: 1,
            endLine: files.length,
          });
          break;
        }
        case "git": {
          const gitInfo = await this.fs.getGitInfo();
          results.push({
            filePath: ".git",
            content: JSON.stringify(gitInfo, null, 2),
            relevance: 6,
            startLine: 1,
            endLine: 1,
          });
          break;
        }
      }
    } catch (error) {
      // 搜索失败时返回空
      const msg = error instanceof Error ? error.message : String(error);
      results.push({
        filePath: "error",
        content: `Search failed: ${msg}`,
        relevance: 0,
        startLine: 0,
        endLine: 0,
      });
    }

    return results;
  }

  private async readFile(filePath: string): Promise<string | null> {
    if (!this.fs) {
      return `// Simulated file content for: ${filePath}\n// (FileSystem not connected)`;
    }

    try {
      return await this.fs.readFile(filePath);
    } catch {
      return null;
    }
  }

  /** 清空搜索缓存 */
  clearCache(): void {
    this.searchCache.clear();
  }
}
