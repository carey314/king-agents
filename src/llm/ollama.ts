/**
 * Ollama 本地模型 LLM Adapter
 *
 * 纯 fetch 实现，使用 Ollama 原生 API 格式 (POST /api/chat)。
 * 默认连接 http://localhost:11434。
 * 支持 streaming 和非 streaming 两种模式。
 * 无需 API Key。
 */

import type {
  LLMMessage,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamChunk,
  TokenUsage,
} from "../agents/base-agent.js";
import { BaseLLMAdapter, type LLMProviderConfig, LLMAdapterFactory } from "./adapter.js";

const OLLAMA_DEFAULT_BASE_URL = "http://localhost:11434";

/**
 * 将通用消息格式转为 Ollama API 格式
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
 * 估算 token 数量
 * 粗略按每 4 个字符 = 1 token 估算
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export class OllamaAdapter extends BaseLLMAdapter {
  private baseUrl: string;

  constructor(config: LLMProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || OLLAMA_DEFAULT_BASE_URL;
  }

  /**
   * 非 streaming 调用
   * Ollama API: POST /api/chat with stream: false
   */
  async chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse> {
    const opts = this.mergeOptions(options);
    const apiMessages = convertMessages(messages);

    const body: Record<string, unknown> = {
      model: opts.model,
      messages: apiMessages,
      stream: false,
      options: {
        num_predict: opts.maxTokens,
        temperature: opts.temperature,
      },
    };

    if (opts.stopSequences.length > 0) {
      (body.options as Record<string, unknown>).stop = opts.stopSequences;
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      message?: { content: string };
      done: boolean;
      prompt_eval_count?: number;
      eval_count?: number;
    };

    const content = data.message?.content ?? "";
    const usage: TokenUsage = {
      inputTokens: data.prompt_eval_count ?? estimateTokens(messages.map((m) => m.content).join("")),
      outputTokens: data.eval_count ?? estimateTokens(content),
    };

    return {
      content,
      usage,
      stopReason: data.done ? "end_turn" : null,
    };
  }

  /**
   * Streaming 调用
   * Ollama API: POST /api/chat with stream: true (default)
   * 返回 NDJSON 格式（每行一个 JSON 对象）
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
      stream: true,
      options: {
        num_predict: opts.maxTokens,
        temperature: opts.temperature,
      },
    };

    if (opts.stopSequences.length > 0) {
      (body.options as Record<string, unknown>).stop = opts.stopSequences;
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error("Ollama API returned no response body for streaming.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let totalContent = "";
    let promptEvalCount = 0;
    let evalCount = 0;

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
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed) as {
              message?: { content: string };
              done: boolean;
              prompt_eval_count?: number;
              eval_count?: number;
            };

            // Accumulate content deltas
            const delta = parsed.message?.content;
            if (delta) {
              totalContent += delta;
              yield {
                type: "content_delta",
                delta,
              };
            }

            // Final chunk contains usage stats
            if (parsed.done) {
              promptEvalCount = parsed.prompt_eval_count ?? 0;
              evalCount = parsed.eval_count ?? 0;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Emit usage
    const usage: TokenUsage = {
      inputTokens: promptEvalCount || estimateTokens(messages.map((m) => m.content).join("")),
      outputTokens: evalCount || estimateTokens(totalContent),
    };

    yield { type: "usage", usage };
    yield { type: "stop", stopReason: "end_turn" };
  }
}

// 注册到工厂
LLMAdapterFactory.register("ollama", OllamaAdapter);
