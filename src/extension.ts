/**
 * King Agents — VS Code Extension 入口
 *
 * 注册命令、创建 Webview、启动 Agent Runtime。
 * 负责将 extension host 能力（文件系统、终端、编辑器等）
 * 注入到 Agent 系统中。
 */

import * as vscode from "vscode";
import { Orchestrator, type SessionPhase } from "./runtime/orchestrator.js";
import { LLMAdapterFactory, type LLMProvider, type LLMProviderConfig } from "./llm/adapter.js";
import type { ILLMAdapter, AgentRole, AgentState, SessionStats } from "./agents/base-agent.js";
import type { IFileSystem, FileSearchResult, GitInfo, SearchOptions } from "./agents/scout.js";
import type { ICommandExecutor } from "./agents/builder.js";
import type { GameEvent } from "./runtime/game-state-manager.js";
import { PROVIDER_BASE_URLS, PROVIDER_DEFAULT_MODELS, getModelsForPreset, type ModelPreset } from "./config/defaults.js";

// 确保所有 adapter 被注册
import "./llm/anthropic.js";
import "./llm/openai.js";
import "./llm/openai-compatible.js";
import "./llm/ollama.js";

// ─── 全局状态 ──────────────────────────────────────────────────

let orchestrator: Orchestrator | null = null;
let battlefieldPanel: vscode.WebviewPanel | null = null;
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

// ─── Extension 生命周期 ────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel("King Agents");
  outputChannel.appendLine("King Agents activating...");

  // 状态栏
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = "$(play) King Agents";
  statusBarItem.tooltip = "Click to start a session";
  statusBarItem.command = "kingAgents.startSession";
  statusBarItem.show();

  // 注册命令
  context.subscriptions.push(
    vscode.commands.registerCommand("kingAgents.startSession", () => startSessionCommand()),
    vscode.commands.registerCommand("kingAgents.openBattlefield", () => openBattlefield(context)),
    vscode.commands.registerCommand("kingAgents.cancelSession", () => cancelSession()),
    vscode.commands.registerCommand("kingAgents.showStats", () => showStats()),
    statusBarItem,
    outputChannel,
  );

  outputChannel.appendLine("King Agents activated successfully.");
}

export function deactivate(): void {
  orchestrator?.cancelSession();
  battlefieldPanel?.dispose();
}

// ─── 命令实现 ──────────────────────────────────────────────────

/**
 * 开始新对局：弹出输入框让用户输入需求
 */
async function startSessionCommand(): Promise<void> {
  const config = vscode.workspace.getConfiguration("kingAgents");
  const provider = config.get<LLMProvider>("provider", "anthropic");

  // 获取 API Key：优先读新的 apiKey，向后兼容旧的 anthropicApiKey
  let apiKey = config.get<string>("apiKey", "");
  if (!apiKey && provider === "anthropic") {
    apiKey = config.get<string>("anthropicApiKey", "");
  }

  // Ollama 不需要 API Key，其他提供商需要
  const needsApiKey = provider !== "ollama";
  if (needsApiKey && !apiKey) {
    const action = await vscode.window.showWarningMessage(
      `King Agents: Please set your API Key for ${provider}.`,
      "Open Settings",
    );
    if (action === "Open Settings") {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "kingAgents.apiKey",
      );
    }
    return;
  }

  // 如果已有对局在运行
  if (orchestrator?.getSessionState()?.phase !== undefined) {
    const currentPhase = orchestrator.getSessionState()!.phase;
    if (currentPhase !== "idle" && currentPhase !== "victory" && currentPhase !== "defeat") {
      const action = await vscode.window.showWarningMessage(
        "A session is already in progress. Cancel it?",
        "Cancel Current",
        "Keep Running",
      );
      if (action === "Cancel Current") {
        orchestrator.cancelSession();
      } else {
        return;
      }
    }
  }

  // 弹出输入框
  const userPrompt = await vscode.window.showInputBox({
    title: "King Agents - New Session",
    prompt: "Describe what you want to build / fix / refactor...",
    placeHolder: "e.g. Add a phone number verification code login to the login page",
    ignoreFocusOut: true,
  });

  if (!userPrompt) return;

  // 初始化 Orchestrator
  try {
    orchestrator = createOrchestrator(provider, apiKey, config);
    bindOrchestratorEvents(orchestrator);

    // 更新状态栏
    updateStatusBar("working", "Planning...");

    outputChannel.appendLine(`\n${"=".repeat(60)}`);
    outputChannel.appendLine(`New session: ${userPrompt}`);
    outputChannel.appendLine(`${"=".repeat(60)}\n`);

    // 开始对局
    await orchestrator.startSession(userPrompt);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`King Agents Error: ${msg}`);
    outputChannel.appendLine(`ERROR: ${msg}`);
    updateStatusBar("idle");
  }
}

/**
 * 打开像素办公室 Webview
 */
function openBattlefield(context: vscode.ExtensionContext): void {
  if (battlefieldPanel) {
    battlefieldPanel.reveal();
    return;
  }

  const distWebview = vscode.Uri.joinPath(context.extensionUri, "dist", "webview");
  const assetsPublic = vscode.Uri.joinPath(context.extensionUri, "webview-ui", "public");

  battlefieldPanel = vscode.window.createWebviewPanel(
    "kingAgents.office",
    "King Agents 像素办公室",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      localResourceRoots: [distWebview, assetsPublic],
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, "dist"),
        vscode.Uri.joinPath(context.extensionUri, "resources"),
      ],
    },
  );

  // 设置 Webview HTML
  battlefieldPanel.webview.html = getBattlefieldHtml(battlefieldPanel.webview, context.extensionUri);

  // Webview → Extension Host 消息
  battlefieldPanel.webview.onDidReceiveMessage(
    (message: { command: string; data?: unknown }) => {
      handleWebviewMessage(message);
    },
    undefined,
    context.subscriptions,
  );

  // 绑定游戏事件 → Webview
  if (orchestrator) {
    const gameState = orchestrator.getGameStateManager();
    gameState.on("game_event", (event: GameEvent) => {
      battlefieldPanel?.webview.postMessage({
        type: "game_event",
        event,
      });
    });
  }

  battlefieldPanel.onDidDispose(() => {
    battlefieldPanel = null;
  });
}

/**
 * 取消当前对局
 */
function cancelSession(): void {
  if (!orchestrator) {
    vscode.window.showInformationMessage("No session is running.");
    return;
  }

  orchestrator.cancelSession();
  updateStatusBar("idle");
  vscode.window.showInformationMessage("Session cancelled (Surrender).");
}

/**
 * 显示统计信息
 */
function showStats(): void {
  if (!orchestrator) {
    vscode.window.showInformationMessage("No session data available.");
    return;
  }

  const states = orchestrator.getAgentStates();
  const session = orchestrator.getSessionState();

  const lines: string[] = [
    "=== King Agents Session Stats ===",
    "",
  ];

  if (session) {
    lines.push(`Phase: ${session.phase}`);
    lines.push(`Duration: ${Math.round((Date.now() - session.startTime) / 1000)}s`);
    lines.push("");
  }

  const roles: AgentRole[] = ["router", "coder", "guardian", "builder", "scout"];
  for (const role of roles) {
    const state = states[role];
    lines.push(
      `${role.padEnd(10)} | ${state.status.padEnd(10)} | progress: ${state.progress}% | tokens: ${state.tokenUsed}`,
    );
  }

  outputChannel.appendLine(lines.join("\n"));
  outputChannel.show();
}

// ─── Orchestrator 初始化 ──────────────────────────────────────

/**
 * 解析提供商的 baseURL
 * 优先使用用户自定义的 apiBaseUrl，否则用预设值
 */
function resolveBaseUrl(provider: LLMProvider, customBaseUrl: string): string | undefined {
  if (customBaseUrl) {
    return customBaseUrl;
  }
  return PROVIDER_BASE_URLS[provider];
}

function createOrchestrator(
  provider: LLMProvider,
  apiKey: string,
  config: vscode.WorkspaceConfiguration,
): Orchestrator {
  const preset = config.get<ModelPreset>("modelPreset", "balanced");
  const customBaseUrl = config.get<string>("apiBaseUrl", "");
  const customModel = config.get<string>("model", "");

  // 获取该 provider + preset 下各角色对应的模型
  const roleModels = getModelsForPreset(provider, preset, customModel || undefined);

  // 对于 Orchestrator，需要传 opus（强模型）和 sonnet（轻量模型）两个 adapter
  const baseUrl = resolveBaseUrl(provider, customBaseUrl);

  const strongConfig: LLMProviderConfig = {
    provider,
    apiKey: apiKey || undefined,
    baseUrl,
    defaultModel: roleModels.router, // 强模型
  };

  const lightConfig: LLMProviderConfig = {
    provider,
    apiKey: apiKey || undefined,
    baseUrl,
    defaultModel: roleModels.builder, // 轻量模型
  };

  let opusAdapter: ILLMAdapter;
  let sonnetAdapter: ILLMAdapter;

  switch (preset) {
    case "allstar":
      // 全明星阵容：全部用强模型
      opusAdapter = LLMAdapterFactory.create(strongConfig);
      sonnetAdapter = LLMAdapterFactory.create(strongConfig);
      break;
    case "economy":
      // 经济模式：全部用轻量模型
      opusAdapter = LLMAdapterFactory.create(lightConfig);
      sonnetAdapter = LLMAdapterFactory.create(lightConfig);
      break;
    case "balanced":
    default:
      // 均衡模式：核心用强模型，辅助用轻量模型
      opusAdapter = LLMAdapterFactory.create(strongConfig);
      sonnetAdapter = LLMAdapterFactory.create(lightConfig);
      break;
  }

  const maxRetries = config.get<number>("maxRetries", 3);

  const orch = new Orchestrator(
    { opus: opusAdapter, sonnet: sonnetAdapter },
    { maxRetries },
  );

  // 注入文件系统
  orch.setFileSystem(createVSCodeFileSystem());

  // 注入命令执行器
  orch.setCommandExecutor(createVSCodeCommandExecutor());

  return orch;
}

// ─── 事件绑定 ──────────────────────────────────────────────────

function bindOrchestratorEvents(orch: Orchestrator): void {
  orch.on("session:start", (data: { id: string; prompt: string }) => {
    outputChannel.appendLine(`Session started: ${data.id}`);
  });

  orch.on("session:phase", (data: { phase: SessionPhase }) => {
    const phaseNames: Record<SessionPhase, string> = {
      idle: "Idle",
      planning: "Planning (Router analyzing...)",
      laning: "Laning Phase (Scout searching...)",
      roaming: "Roaming Phase (Coder writing...)",
      teamfight: "Teamfight! (Guardian + Builder)",
      summarizing: "Summarizing results...",
      victory: "Victory!",
      defeat: "Defeat...",
    };
    updateStatusBar(
      data.phase === "victory" || data.phase === "defeat" ? "idle" : "working",
      phaseNames[data.phase],
    );
  });

  orch.on("agent:output_delta", (data: { role: AgentRole; delta: string }) => {
    outputChannel.append(data.delta);
  });

  orch.on("agent:error", (data: { role: AgentRole; error: string }) => {
    outputChannel.appendLine(`\n[ERROR] ${data.role}: ${data.error}`);
  });

  orch.on("session:victory", (data: { id: string; stats: SessionStats }) => {
    updateStatusBar("idle");
    const msg = `Session complete! MVP: ${data.stats.mvp} | Tokens: ${data.stats.totalTokens} | Duration: ${Math.round(data.stats.duration / 1000)}s`;
    vscode.window.showInformationMessage(msg);
    outputChannel.appendLine(`\n${msg}`);
  });

  orch.on("session:defeat", (data: { id: string; error: string }) => {
    updateStatusBar("idle");
    vscode.window.showErrorMessage(`Session failed: ${data.error}`);
    outputChannel.appendLine(`\nSession failed: ${data.error}`);
  });

  orch.on("session:escalate", (data: { reason: string }) => {
    vscode.window.showWarningMessage(
      `King Agents needs your help: ${data.reason}`,
      "Provide Input",
    );
  });

  // 转发游戏事件到 Webview
  const gameState = orch.getGameStateManager();
  gameState.on("game_event", (event: GameEvent) => {
    battlefieldPanel?.webview.postMessage({
      type: "game_event",
      event,
    });
  });
}

// ─── VS Code 适配层 ───────────────────────────────────────────

/**
 * 创建基于 VS Code API 的文件系统适配器（供 Scout 使用）
 */
function createVSCodeFileSystem(): IFileSystem {
  return {
    async readFile(path: string): Promise<string> {
      const uri = vscode.Uri.file(path);
      const data = await vscode.workspace.fs.readFile(uri);
      return Buffer.from(data).toString("utf-8");
    },

    async listDirectory(path: string, recursive?: boolean): Promise<string[]> {
      const uri = vscode.Uri.file(path);
      const entries = await vscode.workspace.fs.readDirectory(uri);
      const results: string[] = [];

      for (const [name, type] of entries) {
        const fullPath = `${path}/${name}`;
        if (type === vscode.FileType.File) {
          results.push(fullPath);
        } else if (type === vscode.FileType.Directory) {
          results.push(fullPath + "/");
          if (recursive) {
            try {
              const subEntries = await this.listDirectory(fullPath, true);
              results.push(...subEntries);
            } catch {
              // 权限问题等，跳过
            }
          }
        }
      }

      return results;
    },

    async searchContent(query: string, options?: SearchOptions): Promise<FileSearchResult[]> {
      // 使用 VS Code 的文本搜索 API
      const results: FileSearchResult[] = [];

      // 构造搜索 URI（在工作区中搜索）
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return results;
      }

      // 使用 findFiles + readFile 进行搜索
      const includePattern = options?.include?.join(",") ?? "**/*";
      const excludePattern = options?.exclude?.join(",") ?? "**/node_modules/**";

      const files = await vscode.workspace.findFiles(includePattern, excludePattern, options?.maxResults ?? 100);

      for (const fileUri of files) {
        try {
          const content = await vscode.workspace.fs.readFile(fileUri);
          const text = Buffer.from(content).toString("utf-8");
          const lines = text.split("\n");
          const matches: FileSearchResult["matches"] = [];

          for (let i = 0; i < lines.length; i++) {
            const idx = options?.caseSensitive
              ? lines[i].indexOf(query)
              : lines[i].toLowerCase().indexOf(query.toLowerCase());

            if (idx >= 0) {
              matches.push({
                line: i + 1,
                content: lines[i],
                matchStart: idx,
                matchEnd: idx + query.length,
              });
            }
          }

          if (matches.length > 0) {
            results.push({
              filePath: fileUri.fsPath,
              matches,
            });
          }
        } catch {
          // 无法读取的文件，跳过
        }
      }

      return results;
    },

    async searchFiles(pattern: string): Promise<string[]> {
      const files = await vscode.workspace.findFiles(pattern, "**/node_modules/**", 50);
      return files.map((f) => f.fsPath);
    },

    async getGitInfo(): Promise<GitInfo> {
      // 基础 git 信息（可扩展使用 git extension API）
      const gitExtension = vscode.extensions.getExtension("vscode.git");
      if (!gitExtension) {
        return {
          branch: "unknown",
          uncommittedFiles: [],
          recentCommits: [],
        };
      }

      try {
        const git = gitExtension.exports.getAPI(1);
        const repo = git.repositories[0];
        if (!repo) {
          return { branch: "unknown", uncommittedFiles: [], recentCommits: [] };
        }

        return {
          branch: repo.state.HEAD?.name ?? "unknown",
          uncommittedFiles: repo.state.workingTreeChanges.map(
            (c: { uri: vscode.Uri }) => c.uri.fsPath,
          ),
          recentCommits: [],
        };
      } catch {
        return { branch: "unknown", uncommittedFiles: [], recentCommits: [] };
      }
    },
  };
}

/**
 * 创建基于 VS Code Terminal 的命令执行器（供 Builder 使用）
 */
function createVSCodeCommandExecutor(): ICommandExecutor {
  return {
    async execute(
      command: string,
      cwd?: string,
      env?: Record<string, string>,
    ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
      return new Promise((resolve) => {
        const cp = require("child_process") as typeof import("child_process");
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        const proc = cp.exec(command, {
          cwd: cwd ?? workspaceRoot ?? process.cwd(),
          env: { ...process.env, ...env },
          timeout: 120000, // 2 分钟超时
          maxBuffer: 10 * 1024 * 1024, // 10MB
        });

        let stdout = "";
        let stderr = "";

        proc.stdout?.on("data", (data: string) => {
          stdout += data;
        });

        proc.stderr?.on("data", (data: string) => {
          stderr += data;
        });

        proc.on("close", (code: number | null) => {
          resolve({
            exitCode: code ?? 1,
            stdout,
            stderr,
          });
        });

        proc.on("error", (err: Error) => {
          resolve({
            exitCode: 1,
            stdout,
            stderr: err.message,
          });
        });
      });
    },
  };
}

// ─── Webview ──────────────────────────────────────────────────

function handleWebviewMessage(message: { command: string; data?: unknown }): void {
  switch (message.command) {
    case "hero:click":
      // 用户点击了英雄
      outputChannel.appendLine(`Hero clicked: ${JSON.stringify(message.data)}`);
      break;

    case "hero:pause": {
      // 暂停某个 Agent
      const role = (message.data as { role: AgentRole }).role;
      outputChannel.appendLine(`Pausing ${role}...`);
      break;
    }

    case "hero:retry": {
      // 重试某个 Agent
      const retryRole = (message.data as { role: AgentRole }).role;
      outputChannel.appendLine(`Retrying ${retryRole}...`);
      break;
    }

    case "getState":
      // Webview 请求当前状态
      if (orchestrator) {
        battlefieldPanel?.webview.postMessage({
          type: "state_sync",
          data: {
            agentStates: orchestrator.getAgentStates(),
            session: orchestrator.getSessionState(),
            towerState: orchestrator.getGameStateManager().getTowerState(),
            heroPositions: orchestrator.getGameStateManager().getHeroPositions(),
          },
        });
      }
      break;
  }
}

/**
 * 生成像素办公室 Webview 的 HTML
 * 加载 dist/webview/ 中构建好的 Svelte + Phaser 应用
 */
function getBattlefieldHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = getNonce();

  // dist/webview/assets/ 中的构建产物
  const distWebview = vscode.Uri.joinPath(extensionUri, "dist", "webview");
  const assetsDir = vscode.Uri.joinPath(distWebview, "assets");

  // webview-ui/public/assets/ 中的像素素材（图片）
  const publicAssets = vscode.Uri.joinPath(extensionUri, "webview-ui", "public", "assets");

  // 转换为 webview 可用的 URI
  const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(assetsDir, "index.css"));
  const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(assetsDir, "index.js"));
  const assetsBaseUri = webview.asWebviewUri(publicAssets);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data: blob:; connect-src https://fonts.googleapis.com https://fonts.gstatic.com;">
  <title>King Agents 像素办公室</title>
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="${cssUri}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #F5E6D3; }
    #app { width: 100%; height: 100%; position: relative; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}">
    // 让 Phaser 能找到像素素材的基路径
    window.__KING_AGENTS_ASSETS_BASE__ = "${assetsBaseUri}";
    // 提供 VS Code API
    window.__VSCODE_API__ = acquireVsCodeApi();
  </script>
  <script nonce="${nonce}" type="module" src="${jsUri}"></script>
</body>
</html>`;
}

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// ─── 状态栏更新 ──────────────────────────────────────────────

function updateStatusBar(status: "idle" | "working", message?: string): void {
  if (status === "idle") {
    statusBarItem.text = "$(play) King Agents";
    statusBarItem.tooltip = "Click to start a session";
    statusBarItem.command = "kingAgents.startSession";
  } else {
    statusBarItem.text = `$(loading~spin) ${message ?? "Working..."}`;
    statusBarItem.tooltip = message ?? "Session in progress";
    statusBarItem.command = "kingAgents.cancelSession";
  }
}
