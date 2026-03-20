/**
 * LLM Adapter — 统一 LLM 接口层
 *
 * 定义了通用的 LLM 调用接口，各 Provider 实现此接口。
 * 支持同步调用和 streaming 两种模式。
 */

import type {
  ILLMAdapter,
  LLMMessage,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamChunk,
} from "../agents/base-agent.js";

/**
 * LLM Provider 枚举
 *
 * - anthropic: Anthropic Claude
 * - openai: OpenAI GPT
 * - deepseek: DeepSeek 深度求索
 * - doubao: 豆包 (字节跳动)
 * - qwen: 通义千问 (阿里云)
 * - zhipu: 智谱 AI
 * - openai-compatible: 自定义 OpenAI 兼容接口
 * - ollama: Ollama 本地模型
 */
export type LLMProvider =
  | "anthropic"
  | "openai"
  | "deepseek"
  | "doubao"
  | "qwen"
  | "zhipu"
  | "openai-compatible"
  | "ollama";

/**
 * Provider 配置
 */
export interface LLMProviderConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  maxTokens?: number;
}

/**
 * LLM Adapter 工厂
 * 根据配置创建对应的 Provider 实例
 */
export class LLMAdapterFactory {
  private static adapters = new Map<LLMProvider, new (config: LLMProviderConfig) => ILLMAdapter>();

  /**
   * 注册一个 Provider 实现
   */
  static register(provider: LLMProvider, adapterClass: new (config: LLMProviderConfig) => ILLMAdapter): void {
    this.adapters.set(provider, adapterClass);
  }

  /**
   * 创建 Adapter 实例
   */
  static create(config: LLMProviderConfig): ILLMAdapter {
    const AdapterClass = this.adapters.get(config.provider);
    if (!AdapterClass) {
      throw new Error(`LLM provider "${config.provider}" is not registered. Available: ${[...this.adapters.keys()].join(", ")}`);
    }
    return new AdapterClass(config);
  }
}

/**
 * 抽象基类，提供默认实现
 */
export abstract class BaseLLMAdapter implements ILLMAdapter {
  protected config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  abstract chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse>;
  abstract chatStream(messages: LLMMessage[], options?: LLMRequestOptions): AsyncGenerator<LLMStreamChunk>;

  /**
   * 合并默认选项
   */
  protected mergeOptions(options?: LLMRequestOptions): Required<LLMRequestOptions> {
    return {
      model: options?.model ?? this.config.defaultModel ?? "",
      maxTokens: options?.maxTokens ?? this.config.maxTokens ?? 16384,
      temperature: options?.temperature ?? 1,
      stopSequences: options?.stopSequences ?? [],
    };
  }
}
