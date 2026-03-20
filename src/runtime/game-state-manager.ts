/**
 * GameStateManager — Agent 状态 → 游戏事件翻译器
 *
 * 将 Agent Runtime 的状态变更翻译为游戏化的视觉事件，
 * 这些事件通过 postMessage 发送到 Webview，驱动像素战场的渲染。
 *
 * 映射关系：
 * - Agent idle    → 英雄回泉水
 * - Agent working → 英雄走到对应路上，播放工作动画
 * - Agent waiting → 英雄原地待机，头顶气泡
 * - Agent blocked → 英雄被小怪围攻
 * - Agent ganking → 英雄冲刺到目标路
 * - Agent done    → 摧毁当前路的防御塔
 */

import { EventEmitter } from "events";
import type {
  AgentMessage,
  AgentRole,
  AgentStatus,
  IMessageBus,
  SessionStats,
} from "../agents/base-agent.js";

// ─── 游戏事件类型 ──────────────────────────────────────────────

/** 所有可能的游戏事件 */
export type GameEvent =
  | HeroMoveEvent
  | HeroRecallEvent
  | HeroWaitEvent
  | HeroAttackedEvent
  | HeroGankEvent
  | HeroInteractEvent
  | HeroWorkEvent
  | TowerDestroyEvent
  | TowerDamageEvent
  | EventBannerEvent
  | GameVictoryEvent
  | GameDefeatEvent
  | SessionStartEvent
  | ProgressUpdateEvent;

export interface HeroMoveEvent {
  type: "hero:move";
  role: AgentRole;
  target: Lane;
}

export interface HeroRecallEvent {
  type: "hero:recall";
  role: AgentRole;
  target: "fountain";
}

export interface HeroWaitEvent {
  type: "hero:wait";
  role: AgentRole;
  bubble: string;
}

export interface HeroAttackedEvent {
  type: "hero:attacked";
  role: AgentRole;
  bubble: string;
}

export interface HeroGankEvent {
  type: "hero:gank";
  role: AgentRole;
  from: Lane;
  target: Lane;
}

export interface HeroInteractEvent {
  type: "hero:interact";
  from: AgentRole;
  to: AgentRole;
  animation: InteractionAnimation;
}

export interface HeroWorkEvent {
  type: "hero:work";
  role: AgentRole;
  animation: WorkAnimation;
}

export interface TowerDestroyEvent {
  type: "tower:destroy";
  lane: Lane;
  towerIndex: number; // 0, 1, 2
}

export interface TowerDamageEvent {
  type: "tower:damage";
  lane: Lane;
  towerIndex: number;
  hpPercent: number;
}

export interface EventBannerEvent {
  type: "event:banner";
  banner: BannerType;
  text: string;
  subtext?: string;
}

export interface GameVictoryEvent {
  type: "game:victory";
  stats: SessionStats;
}

export interface GameDefeatEvent {
  type: "game:defeat";
  reason: string;
}

export interface SessionStartEvent {
  type: "session:start";
  sessionId: string;
}

export interface ProgressUpdateEvent {
  type: "progress:update";
  role: AgentRole;
  progress: number;
  lane: Lane;
}

// ─── 地图概念 ──────────────────────────────────────────────────

/** 三条路 + 野区 + 泉水 */
export type Lane = "top" | "mid" | "bot" | "jungle" | "fountain";

/** 交互动画类型 */
export type InteractionAnimation =
  | "deliver_package"   // Scout → Coder: 传递上下文
  | "throw_shield"      // Guardian → Coder: 打回代码
  | "glow_transfer"     // 任意: 数据传输
  | "high_five"         // 协作成功
  | "team_buff";        // 团队增益

/** 工作动画类型 */
export type WorkAnimation =
  | "cast_spell"        // Coder: 施法写代码
  | "shield_scan"       // Guardian: 扫描审查
  | "draw_bow"          // Builder: 拉弓构建
  | "fly_search"        // Scout: 飞行搜索
  | "jungle_dash";      // Router: 丛林穿梭

/** 横幅类型 */
export type BannerType =
  | "first_blood"       // 首次找到关键线索
  | "tower_destroy"     // 子任务完成
  | "tower_lost"        // 被打回/失败
  | "boss_kill"         // 关键里程碑
  | "legendary"         // 连续成功
  | "ace"               // 全军覆没
  | "victory"           // 胜利
  | "defeat";           // 失败

// ─── 角色 → 路线 映射 ──────────────────────────────────────────

const ROLE_LANE_MAP: Record<AgentRole, Lane> = {
  router: "jungle",
  coder: "mid",
  guardian: "top",
  builder: "bot",
  scout: "jungle",
};

const ROLE_WORK_ANIMATION: Record<AgentRole, WorkAnimation> = {
  router: "jungle_dash",
  coder: "cast_spell",
  guardian: "shield_scan",
  builder: "draw_bow",
  scout: "fly_search",
};

// ─── GameStateManager ─────────────────────────────────────────

export class GameStateManager extends EventEmitter {
  private bus: IMessageBus;

  /** 每条路的塔状态：3 座塔，每座 0-100 HP */
  private towerState: Record<Lane, number[]> = {
    top: [100, 100, 100],
    mid: [100, 100, 100],
    bot: [100, 100, 100],
    jungle: [],
    fountain: [],
  };

  /** 当前每个英雄的位置 */
  private heroPositions: Record<AgentRole, Lane> = {
    router: "fountain",
    coder: "fountain",
    guardian: "fountain",
    builder: "fountain",
    scout: "fountain",
  };

  /** 连杀计数 */
  private killStreak: number = 0;

  /** 当前对局 ID */
  private currentSessionId: string | null = null;

  constructor(bus: IMessageBus) {
    super();
    this.bus = bus;
    this.setMaxListeners(50);
    this.bindEvents();
  }

  // ─── 事件绑定 ──────────────────────────────────────────────

  private bindEvents(): void {
    // Agent 状态变更 → 游戏事件
    this.bus.on("agent:state_change", (data) => {
      const { role, prevStatus, state } = data as {
        role: AgentRole;
        prevStatus: AgentStatus;
        state: { status: AgentStatus; progress: number };
      };
      this.onAgentStateChange(role, prevStatus, state.status, state.progress);
    });

    // Agent 间消息 → 英雄交互动画
    this.bus.on("message", (data) => {
      const message = data as AgentMessage;
      this.onAgentMessage(message);
    });

    // Agent 进度 → 塔 HP
    this.bus.on("agent:progress", (data) => {
      const { role, progress } = data as { role: AgentRole; progress: number };
      this.onProgressUpdate(role, progress);
    });
  }

  // ─── 状态变更处理 ──────────────────────────────────────────

  /**
   * 将 Agent 状态变更翻译成游戏事件
   */
  onAgentStateChange(
    role: AgentRole,
    prevStatus: AgentStatus,
    nextStatus: AgentStatus,
    progress: number,
  ): void {
    const events: GameEvent[] = [];

    switch (nextStatus) {
      case "idle":
        // 英雄回泉水
        this.heroPositions[role] = "fountain";
        events.push({ type: "hero:recall", role, target: "fountain" });
        break;

      case "working": {
        // 英雄走到对应路上
        const lane = this.getLane(role);
        this.heroPositions[role] = lane;
        events.push({ type: "hero:move", role, target: lane });
        events.push({
          type: "hero:work",
          role,
          animation: ROLE_WORK_ANIMATION[role],
        });
        break;
      }

      case "waiting":
        // 英雄原地待机
        events.push({ type: "hero:wait", role, bubble: "..." });
        break;

      case "blocked":
        // 英雄被围攻
        this.killStreak = 0; // 重置连杀
        events.push({ type: "hero:attacked", role, bubble: "!" });

        // 己方塔受损
        if (prevStatus === "working") {
          events.push({
            type: "event:banner",
            banner: "tower_lost",
            text: "Blocked!",
            subtext: `${this.getRoleDisplayName(role)} encountered an issue`,
          });
        }
        break;

      case "ganking": {
        // 英雄冲刺
        const from = this.heroPositions[role];
        const target = this.getGankTarget(role);
        this.heroPositions[role] = target;
        events.push({ type: "hero:gank", role, from, target });
        break;
      }

      case "done": {
        // 任务完成 → 推塔
        this.killStreak++;
        const doneLane = this.getLane(role);
        const towerIdx = this.getNextTowerIndex(doneLane);

        if (towerIdx >= 0) {
          this.towerState[doneLane][towerIdx] = 0;
          events.push({ type: "tower:destroy", lane: doneLane, towerIndex: towerIdx });
          events.push({
            type: "event:banner",
            banner: "tower_destroy",
            text: "Tower Destroyed!",
            subtext: `${this.getRoleDisplayName(role)} completed the task`,
          });
        }

        // 连杀播报
        if (this.killStreak === 1 && prevStatus !== "done") {
          events.push({
            type: "event:banner",
            banner: "first_blood",
            text: "First Blood!",
            subtext: `${this.getRoleDisplayName(role)} drew first blood`,
          });
        } else if (this.killStreak >= 5) {
          events.push({
            type: "event:banner",
            banner: "legendary",
            text: "LEGENDARY!",
            subtext: `${this.killStreak} tasks completed without failure`,
          });
        }
        break;
      }
    }

    // 发射所有游戏事件
    for (const event of events) {
      this.emitGameEvent(event);
    }
  }

  /**
   * Agent 间消息 → 英雄间交互动画
   */
  onAgentMessage(msg: AgentMessage): void {
    if (msg.to === "broadcast") return;

    let animation: InteractionAnimation;

    switch (msg.type) {
      case "context":
        animation = "deliver_package";
        break;
      case "review":
        animation = (msg.payload as Record<string, unknown>)?.approved
          ? "high_five"
          : "throw_shield";
        break;
      case "code":
        animation = "glow_transfer";
        break;
      case "gank_request":
        animation = "team_buff";
        break;
      default:
        animation = "glow_transfer";
    }

    this.emitGameEvent({
      type: "hero:interact",
      from: msg.from,
      to: msg.to as AgentRole,
      animation,
    });
  }

  /**
   * 进度更新 → 塔 HP 变化
   */
  onProgressUpdate(role: AgentRole, progress: number): void {
    const lane = this.getLane(role);
    if (lane === "fountain" || lane === "jungle") return;

    // 进度映射到塔 HP：
    // 0-33% → 第一座塔 HP
    // 34-66% → 第二座塔 HP
    // 67-100% → 第三座塔 HP
    const towerIdx =
      progress < 34 ? 0 : progress < 67 ? 1 : 2;
    const towerProgress =
      progress < 34
        ? progress / 33
        : progress < 67
          ? (progress - 34) / 33
          : (progress - 67) / 33;

    const hp = Math.max(0, 100 - towerProgress * 100);
    this.towerState[lane][towerIdx] = hp;

    this.emitGameEvent({
      type: "tower:damage",
      lane,
      towerIndex: towerIdx,
      hpPercent: hp,
    });

    this.emitGameEvent({
      type: "progress:update",
      role,
      progress,
      lane,
    });
  }

  // ─── 对局生命周期 ──────────────────────────────────────────

  onSessionStart(sessionId: string): void {
    this.currentSessionId = sessionId;
    this.killStreak = 0;

    // 重置塔状态
    this.towerState = {
      top: [100, 100, 100],
      mid: [100, 100, 100],
      bot: [100, 100, 100],
      jungle: [],
      fountain: [],
    };

    // 所有英雄回泉水
    const roles: AgentRole[] = ["router", "coder", "guardian", "builder", "scout"];
    for (const role of roles) {
      this.heroPositions[role] = "fountain";
    }

    this.emitGameEvent({ type: "session:start", sessionId });
  }

  onTaskComplete(stats: SessionStats): void {
    this.emitGameEvent({
      type: "event:banner",
      banner: "victory",
      text: "VICTORY!",
      subtext: `MVP: ${this.getRoleDisplayName(stats.mvp)} | ${stats.totalTokens} tokens`,
    });
    this.emitGameEvent({ type: "game:victory", stats });
  }

  onTaskFailed(reason: string): void {
    // 全军覆没
    this.emitGameEvent({
      type: "event:banner",
      banner: "ace",
      text: "ACE!",
      subtext: "All agents stopped",
    });
    this.emitGameEvent({ type: "game:defeat", reason });
  }

  // ─── 查询方法 ──────────────────────────────────────────────

  /** 获取塔状态 */
  getTowerState(): Record<Lane, number[]> {
    return JSON.parse(JSON.stringify(this.towerState));
  }

  /** 获取英雄位置 */
  getHeroPositions(): Record<AgentRole, Lane> {
    return { ...this.heroPositions };
  }

  /** 获取总推塔数 */
  getTowersDestroyed(): number {
    let count = 0;
    for (const towers of Object.values(this.towerState)) {
      for (const hp of towers) {
        if (hp === 0) count++;
      }
    }
    return count;
  }

  /** 获取总塔数 */
  getTotalTowers(): number {
    return 9; // 3 lanes x 3 towers
  }

  // ─── 辅助方法 ──────────────────────────────────────────────

  private getLane(role: AgentRole): Lane {
    return ROLE_LANE_MAP[role];
  }

  private getGankTarget(role: AgentRole): Lane {
    // 默认 Gank 中路
    if (role === "router" || role === "scout") return "mid";
    return ROLE_LANE_MAP[role];
  }

  private getNextTowerIndex(lane: Lane): number {
    const towers = this.towerState[lane];
    if (!towers) return -1;
    return towers.findIndex((hp) => hp > 0);
  }

  private getRoleDisplayName(role: AgentRole): string {
    const names: Record<AgentRole, string> = {
      router: "Router(打野)",
      coder: "Coder(中路)",
      guardian: "Guardian(对抗路)",
      builder: "Builder(发育路)",
      scout: "Scout(辅助)",
    };
    return names[role];
  }

  private emitGameEvent(event: GameEvent): void {
    this.emit("game_event", event);
    // 同时在 bus 上广播，供 webview 通信使用
    this.bus.emit("game:event", event);
  }
}
