/**
 * King Agents — 默认配置
 *
 * 包含 Token 预算、模型配置、超时设置等默认值。
 * 各提供商的预设 baseURL 和默认模型名均在此文件集中管理。
 */

import type { AgentRole } from "../agents/base-agent.js";
import type { LLMProvider } from "../llm/adapter.js";

// ─── 提供商预设 baseURL ──────────────────────────────────────────

/**
 * 各提供商的预设 API 地址
 * openai-compatible 和 ollama 需要用户自行填写或使用默认值
 */
export const PROVIDER_BASE_URLS: Partial<Record<LLMProvider, string>> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  doubao: "https://ark.cn-beijing.volces.com/api/v3",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  zhipu: "https://open.bigmodel.cn/api/paas/v4",
  ollama: "http://localhost:11434",
};

// ─── 各提供商默认模型 ─────────────────────────────────────────

/**
 * 每个提供商的「强模型」与「轻量模型」
 * strong: 核心角色（router, coder, guardian）使用
 * light:  辅助角色（builder, scout）使用
 */
export const PROVIDER_DEFAULT_MODELS: Record<LLMProvider, { strong: string; light: string }> = {
  anthropic:          { strong: "claude-opus-4-20250514",    light: "claude-sonnet-4-20250514" },
  openai:             { strong: "gpt-4o",                    light: "gpt-4o-mini" },
  deepseek:           { strong: "deepseek-chat",             light: "deepseek-chat" },
  doubao:             { strong: "doubao-1.5-pro-256k",       light: "doubao-1.5-pro-256k" },
  qwen:               { strong: "qwen-max",                  light: "qwen-plus" },
  zhipu:              { strong: "glm-4-plus",                light: "glm-4-flash" },
  "openai-compatible": { strong: "gpt-4o",                   light: "gpt-4o-mini" },
  ollama:             { strong: "qwen2.5:14b",               light: "qwen2.5:14b" },
};

// ─── 角色 → 模型映射（按 preset） ──────────────────────────────

type RoleModels = Record<AgentRole, string>;

/**
 * 根据 provider 和 preset 获取各角色对应的模型名
 */
export function getModelsForPreset(
  provider: LLMProvider,
  preset: ModelPreset,
  customModel?: string,
): RoleModels {
  const models = PROVIDER_DEFAULT_MODELS[provider];
  const strong = customModel || models.strong;
  const light = customModel || models.light;

  switch (preset) {
    case "allstar":
      // 全明星阵容：全部用强模型
      return {
        router: strong,
        coder: strong,
        guardian: strong,
        builder: strong,
        scout: strong,
      };
    case "economy":
      // 经济模式：全部用轻量模型
      return {
        router: light,
        coder: light,
        guardian: light,
        builder: light,
        scout: light,
      };
    case "balanced":
    default:
      // 均衡模式：核心角色用强模型，辅助角色用轻量模型
      return {
        router: strong,
        coder: strong,
        guardian: strong,
        builder: light,
        scout: light,
      };
  }
}

// ─── 模型配置（保留旧格式以保持兼容） ─────────────────────────

export const DEFAULT_MODELS = {
  balanced: {
    router: "claude-opus-4-20250514",
    coder: "claude-opus-4-20250514",
    guardian: "claude-opus-4-20250514",
    builder: "claude-sonnet-4-20250514",
    scout: "claude-sonnet-4-20250514",
  },
  allstar: {
    router: "claude-opus-4-20250514",
    coder: "claude-opus-4-20250514",
    guardian: "claude-opus-4-20250514",
    builder: "claude-opus-4-20250514",
    scout: "claude-opus-4-20250514",
  },
  economy: {
    router: "claude-sonnet-4-20250514",
    coder: "claude-sonnet-4-20250514",
    guardian: "claude-sonnet-4-20250514",
    builder: "claude-sonnet-4-20250514",
    scout: "claude-sonnet-4-20250514",
  },
} as const;

export type ModelPreset = "balanced" | "allstar" | "economy";

// ─── Token 预算 ────────────────────────────────────────────────

/**
 * 默认 Token 预算（不限制）
 * 设计原则：怎么好用怎么来，不限制 Token
 */
export const DEFAULT_TOKEN_BUDGETS: Record<AgentRole, number> = {
  router: Infinity,
  coder: Infinity,
  guardian: Infinity,
  builder: Infinity,
  scout: Infinity,
};

// ─── 超时设置 ──────────────────────────────────────────────────

export const DEFAULT_TIMEOUTS = {
  /** 单个 Agent 执行超时 */
  agentTimeout: 300000, // 5 分钟
  /** 整个 Session 超时 */
  sessionTimeout: 600000, // 10 分钟
  /** 构建命令执行超时 */
  buildTimeout: 120000, // 2 分钟
  /** 消息等待超时 */
  messageTimeout: 300000, // 5 分钟
};

// ─── 重试配置 ──────────────────────────────────────────────────

export const DEFAULT_RETRY = {
  /** 单个 Agent 最大重试次数 */
  maxAgentRetries: 3,
  /** Guardian ↔ Coder 最大 review 轮次 */
  maxReviewRounds: 3,
  /** Gank 最大次数 */
  maxGankAttempts: 2,
};

// ─── 段位系统 ──────────────────────────────────────────────────

export const RANK_TIERS = [
  { name: "Bronze",   cn: "青铜", minElo: 0 },
  { name: "Silver",   cn: "白银", minElo: 1000 },
  { name: "Gold",     cn: "黄金", minElo: 2000 },
  { name: "Platinum", cn: "铂金", minElo: 3000 },
  { name: "Diamond",  cn: "钻石", minElo: 4000 },
  { name: "Star",     cn: "星耀", minElo: 5000 },
  { name: "King",     cn: "王者", minElo: 6000 },
] as const;

export const RANK_SUBDIVISIONS = ["III", "II", "I"] as const;

// ─── 经验值计算权重 ──────────────────────────────────────────

export const ELO_WEIGHTS = {
  /** 任务完成率 */
  completionRate: 0.4,
  /** Token 效率 */
  tokenEfficiency: 0.3,
  /** 一次通过率（无需 Guardian 打回） */
  firstPassRate: 0.2,
  /** 平均响应时间 */
  responseTime: 0.1,
};
