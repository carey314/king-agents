/**
 * MessageBus — Agent 间通信总线
 *
 * 基于 EventEmitter 模式的消息总线，负责：
 * 1. Agent 间点对点消息投递
 * 2. 广播消息
 * 3. 状态变更通知
 * 4. 消息历史记录（用于回放和调试）
 */

import { EventEmitter } from "events";
import type { AgentMessage, AgentRole, IMessageBus } from "../agents/base-agent.js";

/** 消息过滤器 */
export interface MessageFilter {
  from?: AgentRole;
  to?: AgentRole | "broadcast";
  type?: AgentMessage["type"];
}

export class MessageBus extends EventEmitter implements IMessageBus {
  /** 消息历史（当前 session） */
  private history: AgentMessage[] = [];
  /** 最大历史条数 */
  private maxHistory: number;

  constructor(maxHistory: number = 10000) {
    super();
    this.maxHistory = maxHistory;
    // 提高最大监听数以支持多 Agent
    this.setMaxListeners(50);
  }

  /**
   * 发送 Agent 间消息
   * - 点对点：投递到 `message:{to}` 频道
   * - 广播：投递到所有 Agent 的频道
   */
  send(message: AgentMessage): void {
    // 记录到历史
    this.history.push(message);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // 全局消息事件（供 Orchestrator/GameStateManager 监听）
    this.emit("message", message);

    // 投递到目标 Agent
    if (message.to === "broadcast") {
      const roles: AgentRole[] = ["router", "coder", "guardian", "builder", "scout"];
      for (const role of roles) {
        if (role !== message.from) {
          this.emit(`message:${role}`, message);
        }
      }
    } else {
      this.emit(`message:${message.to}`, message);
    }
  }

  /**
   * 获取消息历史
   * 可选过滤
   */
  getHistory(filter?: MessageFilter): AgentMessage[] {
    if (!filter) {
      return [...this.history];
    }

    return this.history.filter((msg) => {
      if (filter.from && msg.from !== filter.from) return false;
      if (filter.to && msg.to !== filter.to) return false;
      if (filter.type && msg.type !== filter.type) return false;
      return true;
    });
  }

  /**
   * 获取两个 Agent 之间的对话历史
   */
  getConversation(agentA: AgentRole, agentB: AgentRole): AgentMessage[] {
    return this.history.filter(
      (msg) =>
        (msg.from === agentA && msg.to === agentB) ||
        (msg.from === agentB && msg.to === agentA),
    );
  }

  /**
   * 清空历史（新对局时调用）
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * 等待特定消息（Promise 模式）
   * 用于 Agent 等待另一个 Agent 的输出
   */
  waitForMessage(
    filter: MessageFilter,
    timeoutMs: number = 300000, // 5 分钟
  ): Promise<AgentMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off("message", handler);
        reject(new Error(`MessageBus: waitForMessage timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const handler = (msg: unknown) => {
        const message = msg as AgentMessage;
        const matches =
          (!filter.from || message.from === filter.from) &&
          (!filter.to || message.to === filter.to) &&
          (!filter.type || message.type === filter.type);

        if (matches) {
          clearTimeout(timer);
          this.off("message", handler);
          resolve(message);
        }
      };

      this.on("message", handler);
    });
  }

  /**
   * 创建消息流（AsyncGenerator 模式）
   * 持续监听匹配的消息
   */
  async *messageStream(
    filter: MessageFilter,
    signal?: AbortSignal,
  ): AsyncGenerator<AgentMessage> {
    const queue: AgentMessage[] = [];
    let resolve: (() => void) | null = null;
    let done = false;

    const handler = (msg: unknown) => {
      const message = msg as AgentMessage;
      const matches =
        (!filter.from || message.from === filter.from) &&
        (!filter.to || message.to === filter.to) &&
        (!filter.type || message.type === filter.type);

      if (matches) {
        queue.push(message);
        resolve?.();
      }
    };

    const cleanup = () => {
      done = true;
      this.off("message", handler);
      resolve?.();
    };

    signal?.addEventListener("abort", cleanup);
    this.on("message", handler);

    try {
      while (!done) {
        if (queue.length > 0) {
          yield queue.shift()!;
        } else {
          await new Promise<void>((r) => {
            resolve = r;
          });
          resolve = null;
        }
      }
    } finally {
      cleanup();
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalMessages: number;
    byAgent: Record<AgentRole, { sent: number; received: number }>;
    byType: Record<string, number>;
  } {
    const roles: AgentRole[] = ["router", "coder", "guardian", "builder", "scout"];
    const byAgent = {} as Record<AgentRole, { sent: number; received: number }>;
    const byType: Record<string, number> = {};

    for (const role of roles) {
      byAgent[role] = { sent: 0, received: 0 };
    }

    for (const msg of this.history) {
      byAgent[msg.from].sent++;
      if (msg.to !== "broadcast") {
        byAgent[msg.to].received++;
      } else {
        for (const role of roles) {
          if (role !== msg.from) {
            byAgent[role].received++;
          }
        }
      }
      byType[msg.type] = (byType[msg.type] || 0) + 1;
    }

    return {
      totalMessages: this.history.length,
      byAgent,
      byType,
    };
  }
}
