# King Agents — 市场上架策略

> 版本: v1.0 | 最后更新: 2026-03-17 | 负责人: 产品增长负责人

---

## 1. VS Code Marketplace 上架准备清单

### 1.1 必备项

| 项目 | 状态 | 说明 |
|------|------|------|
| Publisher 账号 | 待创建 | 在 https://marketplace.visualstudio.com/manage 注册 publisher "king-agents" |
| Personal Access Token (PAT) | 待创建 | Azure DevOps PAT，用于 vsce publish |
| package.json 完善 | 部分完成 | 见下方元数据优化 |
| README.md | 待创建 | Marketplace 主页展示内容 |
| CHANGELOG.md | 待创建 | 版本更新日志 |
| LICENSE | 已有 (MIT) | 确认 MIT 协议 |
| 图标 (icon) | 待制作 | 128x128 PNG，像素风王冠 |
| 横幅图 (banner) | 待制作 | Marketplace 顶部横幅 |
| 截图 (screenshots) | 待制作 | 至少 3 张功能截图 |
| GIF 演示 | 待制作 | 首屏 GIF 展示核心体验 |
| .vscodeignore | 待创建 | 排除不必要的文件减小包体积 |
| vsce package 测试 | 待执行 | 确认打包无报错，体积 < 5MB |

### 1.2 package.json 优化建议

```jsonc
{
  // 当前已有，需优化的字段
  "displayName": "King Agents — AI Agent 战队",  // 加中文副标题
  "description": "5 AI Agents collaborate in your IDE like a MOBA team. Real-time pixel-art battlefield visualization. 在 IDE 中运行的 5 人 AI 编程战队，像素风实时战场。",

  // 需要新增的字段
  "icon": "resources/icon.png",
  "galleryBanner": {
    "color": "#1a1a2e",    // 深蓝色背景，契合像素风
    "theme": "dark"
  },
  "badges": [
    {
      "url": "https://img.shields.io/badge/Agents-5-blue",
      "href": "https://github.com/king-agents/king-agents",
      "description": "5 AI Agents"
    }
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/king-agents/king-agents"
  },
  "homepage": "https://king-agents.dev",
  "bugs": {
    "url": "https://github.com/king-agents/king-agents/issues"
  },

  // 关键词优化 (SEO)
  "keywords": [
    "ai",
    "agent",
    "multi-agent",
    "coding-assistant",
    "code-generation",
    "ai-coding",
    "moba",
    "pixel-art",
    "claude",
    "anthropic",
    "code-review",
    "copilot-alternative",
    "ai-team",
    "visualization"
  ],

  // 分类优化
  "categories": [
    "AI",
    "Programming Languages",
    "Other"
  ],

  // 预览标记 (MVP 期间使用)
  "preview": true
}
```

### 1.3 发布命令

```bash
# 安装 vsce
npm install -g @vscode/vsce

# 打包
vsce package

# 发布
vsce publish -p <YOUR_PAT>

# 或使用 CI/CD (GitHub Actions)
# 见 .github/workflows/publish.yml
```

---

## 2. Open VSX 上架准备清单

> Open VSX 是 Eclipse 基金会运营的开放扩展市场，Cursor、Trae 等编辑器默认使用。

### 2.1 必备项

| 项目 | 状态 | 说明 |
|------|------|------|
| Open VSX 账号 | 待创建 | https://open-vsx.org/ 注册 |
| Access Token | 待创建 | Open VSX 发布令牌 |
| ovsx 工具 | 待安装 | `npm install -g ovsx` |
| 命名空间 (namespace) | 待申请 | "king-agents" 命名空间 |

### 2.2 发布命令

```bash
# 安装 ovsx
npm install -g ovsx

# 发布 (使用同一个 .vsix 包)
ovsx publish king-agents-0.1.0.vsix -p <YOUR_TOKEN>
```

### 2.3 Cursor / Trae 兼容性

| 编辑器 | 扩展市场 | 兼容性注意事项 |
|--------|---------|--------------|
| VS Code | VS Code Marketplace | 原生支持，无额外适配 |
| Cursor | Open VSX + 自有市场 | 确认 Webview API 兼容性；Phaser Canvas 在 Cursor Webview 中测试 |
| Trae | Open VSX | 确认 Svelte Webview 渲染正常 |
| VSCodium | Open VSX | 与 VS Code 完全兼容 |

---

## 3. 插件名称、描述、关键词优化 (SEO)

### 3.1 名称策略

| 方案 | 名称 | 分析 |
|------|------|------|
| **推荐** | **King Agents — AI Agent 战队** | "King Agents" 简短好记 + 中文副标题说明功能 |
| 备选 A | King Agents — MOBA-style AI Coding Team | 国际化版本 |
| 备选 B | 王者智能体 (King Agents) | 纯中文优先 |

### 3.2 描述策略 (Short Description)

**英文版 (主)**:
> 5 AI Agents collaborate in your IDE like a MOBA team — Router dispatches, Coder writes, Guardian reviews, Builder deploys, Scout searches. Real-time pixel-art battlefield visualization.

**中文版 (副)**:
> IDE 中的 5 人 AI Agent 战队：打野调度、中路编码、对抗路审查、发育路构建、辅助搜索。像素风实时战场可视化。

### 3.3 关键词矩阵

| 类别 | 关键词 | 搜索量预估 |
|------|--------|-----------|
| 核心功能 | ai coding assistant, ai agent, multi-agent, code generation | 高 |
| 差异化 | moba ai, pixel art ide, ai team, ai collaboration | 低-中 |
| 竞品关联 | copilot alternative, cursor alternative, cline alternative | 中 |
| 技术关键词 | claude, anthropic, code review, test generation | 中 |
| 中文关键词 | AI 编程, AI 助手, 多智能体, 王者荣耀, 像素风 | 中 (中文社区) |

### 3.4 README.md 结构建议 (Marketplace 首页)

```markdown
# King Agents — AI Agent 战队 ⚔️

> 5 个 AI Agent 在你的 IDE 里组队开发，像打一局王者一样完成编程任务。

[首屏 GIF: 像素风战场运行截图，5 个小人在跑动]

## ✨ 核心特色
- 🌲 **打野 Router** — 任务拆解与智能调度
- 🗡️ **中路 Coder** — 核心编码输出
- 🛡️ **对抗路 Guardian** — Code Review + 测试生成
- 🏹 **发育路 Builder** — 构建与部署
- 💫 **辅助 Scout** — 代码搜索与上下文收集

## 🎮 像素风实时战场
[截图: 像素战场全景]

## 📊 Token 经济系统
[截图: 经济面板]

## 🚀 快速开始
1. 安装插件
2. 配置 API Key
3. Cmd+Shift+P → "King Agents: Start New Session"
4. 输入你的需求，看战队帮你完成！

## 🏆 段位系统
青铜 → 白银 → 黄金 → 铂金 → 钻石 → 星耀 → 王者
```

---

## 4. 截图 / GIF 要求

### 4.1 必备截图 (至少 5 张)

| 序号 | 内容 | 像素尺寸 | 说明 |
|------|------|---------|------|
| 1 | **首屏 Hero GIF** | 1280x720 | 完整对局流程 15s 动画：开局→英雄跑动→推塔→Victory |
| 2 | **像素战场全景** | 1280x720 | 5 个英雄在 MOBA 地图上的全景截图，标注各角色名称 |
| 3 | **英雄详情气泡** | 1280x720 | 点击 Coder 后弹出的像素风气泡，显示实时代码输出 |
| 4 | **Token 经济面板** | 1280x720 | 像素风柱状图 + 时间线甘特图 |
| 5 | **Victory 结算画面** | 1280x720 | 胜利画面 + KDA + MVP + 段位 |
| 6 | **侧边栏小地图** | 600x800 | 小地图 + 英雄状态列表 |
| 7 | **状态栏** | 1280x200 | 底部状态栏的 5 Agent 状态图标 |

### 4.2 像素风视觉规范

| 规范项 | 要求 |
|--------|------|
| 像素粒度 | 32x32 sprite，渲染放大 2x (64x64) |
| 调色板 | 限制在 32 色以内 (参考 PICO-8 调色板) |
| 字体 | 像素字体 (Press Start 2P / Zpix) |
| 背景色 | 深蓝 #1a1a2e (暗色主题友好) |
| 高亮色 | 金色 #ffd700 (成就/段位) + 蓝色 #4fc3f7 (己方) + 红色 #ef5350 (敌方) |
| 动画帧率 | 8-12 fps (像素风经典帧率) |
| 截图格式 | PNG (截图) / GIF (动画，< 5MB) / WebM (视频) |

### 4.3 GIF 制作脚本参考

```
场景 1: "一句话需求到 Victory" (15s GIF)
  0s  — 用户在输入框输入 "添加用户列表 API"
  2s  — 状态栏亮起，5 个英雄从泉水出发
  4s  — Scout 飞向野区搜索，头顶出现搜索动画
  6s  — Coder 走到中路，开始施法（代码符号飞舞）
  8s  — Guardian 走到上路，举放大镜检视
  10s — 屏幕弹出 "敌方防御塔已摧毁"
  12s — Builder 拉弓射箭（构建成功）
  14s — 敌方水晶爆炸 → "VICTORY!"
  15s — 结算画面 + KDA

场景 2: "Gank 支援" (10s GIF)
  0s  — Coder 在中路编码，头顶出现 ❗ (卡住了)
  2s  — Router 从草丛冲出，速度线特效
  4s  — Router 到达中路，与 Coder 并肩
  6s  — Scout 飞来传递 📦
  8s  — Coder 头顶 💡，继续编码
  10s — 防御塔被摧毁

场景 3: "Guardian 打回" (8s GIF)
  0s  — Coder 提交代码
  2s  — Guardian 举盾，扔出 ❌
  4s  — Coder 被击中，头顶 😤
  5s  — 己方塔受损动画
  6s  — Coder 重新施法
  8s  — Guardian 竖大拇指 ✅
```

---

## 5. 首发推广渠道

### 5.1 中国开发者社区 (核心阵地)

| 平台 | 内容形式 | 发布策略 | 预期效果 |
|------|---------|---------|---------|
| **掘金** | 技术文章 | 首发长文："我做了一个 MOBA 风格的 AI 编程插件"，包含技术实现细节 + 像素截图 | 5k-20k 阅读，引发技术讨论 |
| **V2EX** | 帖子 | 在 /t/create 和 /t/programmer 发帖："Show: 像素风 AI Agent 战队 IDE 插件"，简短有力 | 高质量讨论，早期种子用户 |
| **知乎** | 回答 + 文章 | 回答 "有哪些好用的 AI 编程工具" 类问题，附产品介绍；专栏文章讲技术思路 | 长尾流量，SEO 价值 |
| **B站** | 短视频 | 3 分钟演示视频："5 个 AI 小人帮你写代码"，重点展示像素风战场的视觉冲击力 | 病毒传播潜力最大 |
| **微信公众号** | 技术文章 | 发到几个头部技术公众号 (前端之巅、InfoQ 等)，或自建公众号首发 | 精准触达中国开发者 |
| **X (Twitter)** | 推文 + GIF | 英文推文 + 像素战场 GIF，标签 #AIcoding #VSCode #OpenSource | 海外开发者触达 |
| **Reddit** | 帖子 | r/vscode, r/programming, r/artificial 发帖 | 海外社区讨论 |
| **Hacker News** | Show HN | "Show HN: King Agents – MOBA-style Multi-Agent AI Coding in VS Code" | 高质量海外开发者 |
| **即刻** | 动态 | AI 产品圈发动态，带截图 | 产品爱好者 |
| **少数派** | 测评文 | 投稿/自发 App+1 测评 | 高质量中文读者 |

### 5.2 时间线

```
D-14  准备所有截图、GIF、演示视频素材
D-7   预发布到 VS Code Marketplace (Preview 标记)
D-3   邀请 10-20 个种子用户内测，收集反馈并修复问题
D-1   撰写掘金/知乎/V2EX 文章初稿

D-Day (正式发布):
  上午 10:00 — 去除 Preview 标记，正式发布
  上午 10:30 — 掘金首发文章
  上午 11:00 — V2EX 发帖
  下午 14:00 — 知乎文章 + 回答
  下午 16:00 — B站视频上线
  晚上 20:00 — X/Twitter 英文推文
  晚上 21:00 — Reddit/HN 发帖 (北美时区白天)

D+1  监控各平台评论，及时回复
D+3  根据反馈发布 hotfix (如有)
D+7  发布第一周数据总结 + 感谢帖
```

---

## 6. 冷启动策略

### 6.1 种子用户获取 (发布前)

| 策略 | 具体做法 | 目标人数 |
|------|---------|---------|
| **技术博主合作** | 联系 3-5 个 B站/掘金技术博主，免费体验 + 出测评视频/文章 | 50-100 首日安装 |
| **开源社区** | 在 Cline/Continue 等开源 AI 编程工具的 Discord/GitHub 讨论区宣传 | 30-50 |
| **公司内部** | 在团队/公司内部推广使用 | 10-20 |
| **王者荣耀社区** | 在 NGA/贴吧王者荣耀区发 "程序员做了个王者荣耀主题 IDE 插件" | 破圈传播 |
| **GitHub Star 互助** | 在 trending 相关项目的 issue/discussion 中有节制地提及 | GitHub 曝光 |

### 6.2 冷启动飞轮

```
像素风截图/GIF 传播
        │
        ▼
开发者好奇安装 (视觉驱动)
        │
        ▼
首次 "开局" 体验 (功能驱动)
        │
        ▼
"Victory!" 结算画面 → 段位展示
        │
        ▼
截图/分享到社交媒体 (社交驱动)
        │
        ▼
更多开发者看到 → 安装
        │
        ▼
        ↑ 循环 ↑
```

**关键驱动力**：像素风战场的视觉冲击力是冷启动的核心引擎。"5 个像素小人在 IDE 里跑来跑去" 这个画面本身就有极强的传播力。

### 6.3 冷启动目标

| 时间节点 | 目标安装量 | 关键动作 |
|---------|-----------|---------|
| 发布首日 | 200+ | 掘金/V2EX/知乎集中发文 |
| 首周 | 1,000+ | B站视频 + X/Twitter + HN |
| 首月 | 5,000+ | 持续内容输出 + 社区运营 |
| 3 个月 | 15,000+ | 迭代 Phase 2 (像素战场上线) + 第二波传播 |
| 6 个月 | 30,000+ | Phase 3 (游戏化) + 国际化 |

---

## 7. 国际化路线

### 7.1 时间规划

| 阶段 | 时间 | 国际化动作 |
|------|------|-----------|
| Phase 1-2 | 前 2-3 个月 | **中文优先**。README 中英双语。UI 以中文为主，代码/命令用英文 |
| Phase 3 | 第 4 个月 | **引入 i18n 框架**。抽取所有 UI 字符串到 locale 文件 |
| Phase 4 | 第 5-6 个月 | **发布英文版**。Marketplace 描述双语。MOBA 术语切换为通用术语 |
| Phase 5 | 6 个月后 | **社区驱动翻译**。日语、韩语 (MOBA 强势市场) |

### 7.2 MOBA 术语国际化映射

| 中文 (王者荣耀) | English (Generic MOBA) | 日本語 | 한국어 |
|----------------|----------------------|--------|--------|
| 打野 | Jungler | ジャングラー | 정글러 |
| 中路 | Mid Laner | ミッドレーナー | 미드라이너 |
| 对抗路 | Off Laner / Top | トップレーナー | 탑라이너 |
| 发育路 | Carry / ADC | キャリー | 원딜 |
| 辅助 | Support | サポート | 서포터 |
| Gank | Gank | ガンク | 갱크 |
| 团战 | Teamfight | チームファイト | 팀파이트 |
| 推塔 | Push Tower | タワー破壊 | 타워 파괴 |
| KDA | KDA | KDA | KDA |
| 段位 | Rank | ランク | 랭크 |
| 开局 | Start Match | 試合開始 | 경기 시작 |
| Victory | Victory | 勝利 | 승리 |
| Defeat | Defeat | 敗北 | 패배 |

### 7.3 为什么日韩是重要市场

- **日本**：LoL 和 MOBA 手游用户群庞大，开发者社区活跃
- **韩国**：LoL 发源地级市场，MOBA 文化深入人心，IT 产业发达
- 两个市场对 "游戏 + 编程" 的跨界概念接受度极高

### 7.4 技术实现

```typescript
// src/i18n/index.ts
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

// 根据 VS Code 语言设置自动选择
const locale = vscode.env.language;

// 术语切换
// 中文用户看到: "🌲 打野 (Router)"
// 英文用户看到: "🌲 Jungler (Router)"
```

---

## 8. 内容营销计划

### 8.1 技术文章系列 (掘金/知乎/公众号)

| 序号 | 标题 | 发布时机 | 目标 |
|------|------|---------|------|
| 1 | "我做了一个王者荣耀风格的 AI 编程插件" | 发布日 | 产品介绍 + 安装引导 |
| 2 | "如何用 Phaser 在 VS Code Webview 中做像素游戏" | 发布后 1 周 | 技术分享 + 引流 |
| 3 | "Multi-Agent 编程架构设计：从单 Agent 到五人团队" | 发布后 2 周 | 技术深度 + 建立权威 |
| 4 | "Agent 间的 Gank 机制：如何实现动态任务调度" | 发布后 3 周 | 技术细节 + 持续曝光 |
| 5 | "像素风 UI 设计：如何在 IDE 中做游戏化体验" | 发布后 4 周 | 设计分享 + 跨界传播 |
| 6 | "King Agents 第一个月数据复盘" | 发布后 1 月 | 透明运营 + 社区信任 |

### 8.2 B站视频计划

| 序号 | 内容 | 时长 | 风格 |
|------|------|------|------|
| 1 | "5 个 AI 小人帮你写代码！" — 产品演示 | 3 分钟 | 轻松有趣，重点展示像素战场 |
| 2 | "看 AI Agent 团战修 Bug" — 实战演示 | 5 分钟 | 实际项目中使用，展示全流程 |
| 3 | "从零实现像素风 VS Code 插件" — 教程 | 15 分钟 | 技术教程，吸引开发者 |
| 4 | "AI Agent 写代码有多离谱" — 系列内容 | 5 分钟 | 持续内容输出 |
