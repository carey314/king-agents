/**
 * Anthropic Claude LLM Adapter
 *
 * 使用 @anthropic-ai/sdk 实现 Claude API 调用。
 * 支持 streaming 和非 streaming 两种模式。
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  LLMMessage,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamChunk,
  TokenUsage,
} from "../agents/base-agent.js";
import { BaseLLMAdapter, type LLMProviderConfig, LLMAdapterFactory } from "./adapter.js";

/**
 * 将通用消息格式转为 Anthropic API 格式
 */
function convertMessages(messages: LLMMessage[]): {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
} {
  let system = "";
  const apiMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      system += (system ? "\n\n" : "") + msg.content;
    } else {
      apiMessages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }
  }

  return { system, messages: apiMessages };
}

export class AnthropicAdapter extends BaseLLMAdapter {
  private client: Anthropic;

  constructor(config: LLMProviderConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  /**
   * 非 streaming 调用
   */
  async chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse> {
    const opts = this.mergeOptions(options);
    const { system, messages: apiMessages } = convertMessages(messages);

    const response = await this.client.messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      system: system || undefined,
      messages: apiMessages,
      ...(opts.stopSequences.length > 0 ? { stop_sequences: opts.stopSequences } : {}),
    });

    // 提取文本内容
    let content = "";
    for (const block of response.content) {
      if (block.type === "text") {
        content += block.text;
      }
    }

    return {
      content,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      stopReason: response.stop_reason,
    };
  }

  /**
   * Streaming 调用
   * yield LLMStreamChunk 让上层逐步拼接输出
   */
  async *chatStream(messages: LLMMessage[], options?: LLMRequestOptions): AsyncGenerator<LLMStreamChunk> {
    const opts = this.mergeOptions(options);
    const { system, messages: apiMessages } = convertMessages(messages);

    const stream = this.client.messages.stream({
      model: opts.model,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      system: system || undefined,
      messages: apiMessages,
      ...(opts.stopSequences.length > 0 ? { stop_sequences: opts.stopSequences } : {}),
    });

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const event of stream) {
      if (event.type === "message_start" && event.message?.usage) {
        inputTokens = event.message.usage.input_tokens;
      } else if (event.type === "content_block_delta") {
        const delta = event.delta;
        if (delta && "text" in delta && typeof delta.text === "string") {
          yield {
            type: "content_delta",
            delta: delta.text,
          };
        }
      } else if (event.type === "message_delta") {
        const usage = (event as unknown as Record<string, unknown>).usage as Record<string, number> | undefined;
        if (usage?.output_tokens) {
          outputTokens = usage.output_tokens;
        }
      }
    }

    // 最终的 usage 汇总
    yield {
      type: "usage",
      usage: {
        inputTokens,
        outputTokens,
      },
    };

    yield {
      type: "stop",
      stopReason: "end_turn",
    };
  }
}

// 注册到工厂
LLMAdapterFactory.register("anthropic", AnthropicAdapter);
