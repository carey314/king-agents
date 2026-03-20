/**
 * OpenAI 兼容接口 LLM Adapter
 *
 * 纯 fetch + SSE 实现，不依赖任何 SDK。
 * 支持所有兼容 OpenAI chat completions 格式的 API：
 *   - DeepSeek
 *   - 豆包 (字节跳动)
 *   - 通义千问 (阿里云)
 *   - 智谱 AI
 *   - 以及任何自定义的 OpenAI 兼容服务
 *
 * 用户可通过 kingAgents.apiBaseUrl 配置自定义地址。
 * 预设的服务商 baseURL 见 src/config/defaults.ts。
 */

import type {
  LLMMessage,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamChunk,
  TokenUsage,
} from "../agents/base-agent.js";
import { BaseLLMAdapter, type LLMProviderConfig, LLMAdapterFactory } from "./adapter.js";

/**
 * 将通用消息格式转为 OpenAI chat completions 格式
 */
function convertMessages(
  messages: LLMMessage[],
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * 估算 token 数量（当 API 不返回用量时使用）
 * 粗略按每 4 个字符 = 1 token 估算
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export class OpenAICompatibleAdapter extends BaseLLMAdapter {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: LLMProviderConfig) {
    super(config);
    if (!config.baseUrl) {
      throw new Error(
        "OpenAI-compatible adapter requires a baseUrl. " +
          "Set it via kingAgents.apiBaseUrl or use a preset provider (deepseek, doubao, qwen, zhipu).",
      );
    }
    this.apiKey = config.apiKey ?? "";
    this.baseUrl = config.baseUrl;
  }

  /**
   * 非 streaming 调用
   */
  async chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse> {
    const opts = this.mergeOptions(options);
    const apiMessages = convertMessages(messages);

    const body: Record<string, unknown> = {
      model: opts.model,
      messages: apiMessages,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
    };

    if (opts.stopSequences.length > 0) {
      body.stop = opts.stopSequences;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI-compatible API error (${response.status}) [${this.baseUrl}]: ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    const content = data.choices?.[0]?.message?.content ?? "";
    const usage: TokenUsage = data.usage
      ? {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
        }
      : {
          inputTokens: estimateTokens(messages.map((m) => m.content).join("")),
          outputTokens: estimateTokens(content),
        };

    return {
      content,
      usage,
      stopReason: data.choices?.[0]?.finish_reason ?? null,
    };
  }

  /**
   * Streaming 调用 (SSE)
   * 解析 Server-Sent Events 格式的 data: {...} 行
   */
  async *chatStream(
    messages: LLMMessage[],
    options?: LLMRequestOptions,
  ): AsyncGenerator<LLMStreamChunk> {
    const opts = this.mergeOptions(options);
    const apiMessages = convertMessages(messages);

    const body: Record<string, unknown> = {
      model: opts.model,
      messages: apiMessages,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      stream: true,
    };

    if (opts.stopSequences.length > 0) {
      body.stop = opts.stopSequences;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI-compatible API error (${response.status}) [${this.baseUrl}]: ${errorText}`,
      );
    }

    if (!response.body) {
      throw new Error("API returned no response body for streaming.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let totalContent = "";
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last potentially incomplete line
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const jsonStr = trimmed.slice(6); // Remove "data: "
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr) as {
              choices?: Array<{
                delta?: { content?: string };
                finish_reason?: string | null;
              }>;
              usage?: { prompt_tokens: number; completion_tokens: number };
            };

            // Some providers return usage in the final SSE chunk
            if (parsed.usage) {
              promptTokens = parsed.usage.prompt_tokens;
              completionTokens = parsed.usage.completion_tokens;
            }

            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              totalContent += delta;
              yield {
                type: "content_delta",
                delta,
              };
            }
          } catch {
            // Skip malformed JSON lines (some providers send extra whitespace/comments)
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Emit usage (estimate if API didn't provide it)
    const usage: TokenUsage =
      promptTokens > 0 || completionTokens > 0
        ? { inputTokens: promptTokens, outputTokens: completionTokens }
        : {
            inputTokens: estimateTokens(messages.map((m) => m.content).join("")),
            outputTokens: estimateTokens(totalContent),
          };

    yield { type: "usage", usage };
    yield { type: "stop", stopReason: "end_turn" };
  }
}

// 注册到工厂 — 用 "openai-compatible" 以及各预设提供商名称
LLMAdapterFactory.register("openai-compatible", OpenAICompatibleAdapter);
LLMAdapterFactory.register("deepseek", OpenAICompatibleAdapter);
LLMAdapterFactory.register("doubao", OpenAICompatibleAdapter);
LLMAdapterFactory.register("qwen", OpenAICompatibleAdapter);
LLMAdapterFactory.register("zhipu", OpenAICompatibleAdapter);
