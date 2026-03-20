/**
 * OpenAI GPT LLM Adapter
 *
 * 使用纯 fetch 实现 OpenAI API 调用（不依赖 openai SDK）。
 * 支持 GPT-4o、GPT-4o-mini、o1 等模型。
 * 支持 streaming (SSE) 和非 streaming 两种模式。
 */

import type {
  LLMMessage,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamChunk,
  TokenUsage,
} from "../agents/base-agent.js";
import { BaseLLMAdapter, type LLMProviderConfig, LLMAdapterFactory } from "./adapter.js";

const OPENAI_BASE_URL = "https://api.openai.com/v1";

/**
 * 将通用消息格式转为 OpenAI API 格式
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

export class OpenAIAdapter extends BaseLLMAdapter {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: LLMProviderConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error("OpenAI adapter requires an API key.");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || OPENAI_BASE_URL;
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

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
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

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error("OpenAI API returned no response body for streaming.");
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

            // Some APIs return usage in the final chunk
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
            // Skip malformed JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Emit usage (estimate if not provided by API)
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

// 注册到工厂
LLMAdapterFactory.register("openai", OpenAIAdapter);
