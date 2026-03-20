# King Agents — 产品需求文档 (PRD)

> 版本: v1.0 | 最后更新: 2026-03-17 | 负责人: 产品增长负责人

---

## 1. 产品愿景与定位

### 一句话定位

**在 IDE 中运行的 5 人 AI Agent MOBA 战队 —— 用王者荣耀五排分路机制协作完成开发任务，让多 Agent 协作变得可见、可控、有趣。**

### 愿景

当前 AI 编程助手还停留在"单英雄带飞"模式（一个 Agent、一个聊天框）。King Agents 要证明：**多 Agent 协作 + 可视化调度 + 游戏化体验** 才是 AI-native 开发的终态。我们不做更好的 Copilot，我们做开发者的"战队"。

### 核心差异化

| 维度 | 现有方案 (Copilot/Cursor/Cline) | King Agents |
|------|-------------------------------|-------------|
| Agent 数量 | 单 Agent | 5 Agent 分工协作 |
| 调度方式 | 用户手动控制或黑盒 | 可视化动态调度，支持 Gank 支援 |
| 成本可见性 | Token 消耗不透明 | 经济系统映射，直觉理解成本 |
| 用户粘性 | 功能驱动 | 游戏化 (KDA、段位、成就) 驱动 |
| 过程可观测性 | 仅看到最终结果 | 像素风战场实时展示每个 Agent 工作状态 |

---

## 2. 目标用户画像

### Persona 1: 小明 —— 全栈独立开发者

| 属性 | 描述 |
|------|------|
| 背景 | 28 岁，3 年经验，在创业公司做全栈，同时维护 2-3 个 side project |
| 日常 | 一个人写前端、后端、部署，经常在不同技术栈间切换 |
| 痛点 | 单人开发缺少 Code Review；AI 助手只能帮写代码，不能帮做测试和构建；每天花大量时间在重复的搜索-编码-测试循环中 |
| 动机 | 想要一个"虚拟团队"帮自己分担全流程工作，而不仅是代码补全 |
| 期望 | 输入一句需求，Agent 团队自动完成搜索-编码-审查-构建全流程；实时看到进度；Token 花费透明 |
| 游戏习惯 | 王者荣耀钻石段位，理解 MOBA 语境，会心一笑地接受"打野 Gank"的调度隐喻 |

### Persona 2: 张姐 —— 技术 Lead / 资深后端

| 属性 | 描述 |
|------|------|
| 背景 | 35 岁，8 年经验，带 5 人后端团队，负责核心服务架构 |
| 日常 | 自己编码时间有限，更多做 Code Review 和架构设计；需要快速验证想法 |
| 痛点 | 想用 AI 加速原型开发，但不信任单 Agent 的代码质量——缺少审查环节；现有工具没有"对抗性验证"机制 |
| 动机 | Guardian (对抗路) 的 Code Review + 否决权机制满足她对代码质量的要求 |
| 期望 | Agent 写完代码后必须经过独立审查，发现问题能自动打回修改；看到完整的审查报告和测试覆盖 |
| 游戏习惯 | 不玩王者，但理解"上路坦克挡伤害"的隐喻就够了 |

### Persona 3: 阿杰 —— 大厂前端工程师 + 技术博主

| 属性 | 描述 |
|------|------|
| 背景 | 26 岁，2 年经验，大厂前端，活跃于掘金/B站/知乎，有 5k 粉丝 |
| 日常 | 关注最新开发工具，喜欢尝鲜并写测评；在团队里推广新工具 |
| 痛点 | 现有 AI 编程工具"长得都一样"——聊天框 + 代码补全，缺少传播性；想找到有话题性的工具来做内容 |
| 动机 | 像素风战场可视化极具传播力——"5 个小人在 IDE 里跑来跑去写代码"天然适合做 GIF/短视频 |
| 期望 | 安装简单，首次体验就有"wow moment"；能截图/录屏分享到社交媒体；有段位和成就可以炫耀 |
| 游戏习惯 | 王者荣耀星耀段位，对 MOBA 术语了如指掌 |

### Persona 4: Dr. Lin —— 海外华人独立开发者

| 属性 | 描述 |
|------|------|
| 背景 | 30 岁，在美国做 SaaS 独立开发者，双语流利 |
| 日常 | 主要用英文开发，但关注中文开发者社区的工具推荐 |
| 痛点 | 想用 multi-agent 方案但找不到好用的 VS Code 插件；Cursor 不够灵活 |
| 动机 | MOBA-inspired 的协作概念新颖（用通用 MOBA 术语 Jungler/Mid/Support 也能理解） |
| 期望 | 支持英文 UI；模型可切换 (Claude/GPT/本地)；MOBA 隐喻用通用术语而非纯王者梗 |

---

## 3. 核心用户旅程

### 3.1 从安装到首次 "开局"

```
Step 1: 发现 (Discovery)
  ├── 在掘金/B站看到像素风战场的截图/GIF → 被吸引
  ├── 搜索 VS Code Marketplace "King Agents"
  └── 看到插件页面的像素风截图 + "5 Agent AI 战队"描述

Step 2: 安装 (Install)
  ├── 点击 Install → 约 500KB，秒装
  ├── 侧边栏出现 King Agents 图标（像素风王冠）
  └── 弹出 Welcome 引导页

Step 3: 配置 (Setup)
  ├── 引导页要求输入 Anthropic API Key
  ├── 选择模型预设：均衡模式(推荐) / 全明星 / 经济模式
  └── 可选：设置 Token 预算上限

Step 4: 首次开局 (First Match)
  ├── Cmd+Shift+P → "King Agents: Start New Session (开局)"
  ├── 输入框出现 → 输入需求："给登录页加一个验证码登录功能"
  ├── 底部状态栏亮起：⚔ King Agents │ 🌲✅ 🗡⏳ 🛡💤 🏹💤 💫✅
  ├── 侧边栏小地图：5 个像素英雄开始跑动
  │   ├── Router 在丛林穿梭 → 任务拆解
  │   ├── Scout 飞向野区 → 搜索相关代码
  │   ├── Coder 走到中路 → 开始编码
  │   ├── Guardian 走到上路 → 准备审查
  │   └── Builder 在下路待命
  ├── 屏幕顶部弹出："First Blood! Scout 找到登录模块"
  ├── 点击 Coder 英雄 → 弹出气泡 → 看到实时代码输出
  └── 最终："Victory!" → 结算画面 → KDA 展示 → 段位显示

Step 5: 确认结果 (Review)
  ├── 编辑器中展示代码变更 diff
  ├── 查看 Guardian 的审查报告
  ├── 查看 Builder 的构建/测试结果
  └── 一键接受或手动调整
```

### 3.2 日常使用流程

```
日常场景 A: 快速编码任务（5 分钟内）
  输入 → Router 判断简单任务 → 仅派 Scout + Coder → 快速完成
  （跳过 Guardian 和 Builder，类似"前期单杀"）

日常场景 B: 复杂功能开发（10-30 分钟）
  输入 → Router 全员调度 → Scout 搜索 → Coder 编码 → Guardian 审查
  → 打回修改 → 再次审查通过 → Builder 构建测试 → Victory
  （完整 "对局"）

日常场景 C: 修 Bug（定向 Gank）
  输入 bug 描述 → Router 分析 → Scout 定位问题代码 → Coder 修复
  → Guardian 验证修复 → Builder 跑回归测试
  （"打野抓人"模式）

日常场景 D: 查看历史 & 段位
  打开侧边栏 → 查看对局历史 → KDA 统计 → 段位进展
  → 分享对局总结到社交媒体
```

---

## 4. 功能优先级矩阵

### P0 — 必须做，没有就不能发布

| 功能 | 描述 | 依赖 |
|------|------|------|
| Router 调度引擎 | 接收用户输入 → 意图识别 → 任务拆解 → 分配执行 | LLM Adapter |
| Coder Agent | 核心编码能力，接收上下文生成代码 | Router, Context Manager |
| Scout Agent | 代码搜索、文件读取、上下文收集 | VS Code API |
| Agent 基类 & 状态机 | 统一的生命周期管理、状态流转 | — |
| LLM Adapter (Anthropic) | Claude API 调用封装 | — |
| 消息总线 (Message Bus) | Agent 间通信 | — |
| 状态栏最小化视图 | 底部状态栏显示 5 个 Agent 实时状态 | Agent 状态机 |
| 侧边栏基础面板 | Agent 状态卡片列表 | Svelte Webview |
| API Key 配置 | 用户输入 Anthropic API Key | VS Code Settings |
| 基础 Token 计数 | 记录每个 Agent 的 Token 消耗 | LLM Adapter |

### P1 — 重要，Phase 2 完成

| 功能 | 描述 | 依赖 |
|------|------|------|
| Guardian Agent | Code Review + 测试生成 + 否决权 | Coder 产出 |
| Builder Agent | 构建、运行测试、解析错误日志 | Terminal API |
| Gank 机制 | Agent 卡住时动态支援 | Router 决策逻辑 |
| 像素风战场 (Phaser) | 像素小人在 MOBA 地图上跑动 | Phaser 3 + Webview |
| 任务流程图 (DAG) | 可视化任务依赖和执行顺序 | D3.js |
| Token 经济面板 | 柱状图展示各 Agent Token 分配 | Token Manager |
| 上下文隔离 | 每个 Agent 只获得相关上下文 | Context Manager |
| 时间线组件 | 甘特图展示各 Agent 工作时段 | Session 数据 |

### P2 — 锦上添花，Phase 3/4 完成

| 功能 | 描述 | 依赖 |
|------|------|------|
| 对局历史存储 | 本地 SQLite/JSON 存储历史记录 | — |
| KDA 统计 & 段位系统 | 游戏化数据统计 | 历史数据 |
| 成就系统 | 五杀、MVP、经济碾压等成就 | KDA 系统 |
| 多 LLM 支持 | OpenAI / Ollama 适配 | LLM Adapter 抽象 |
| 模型级联配置 | 用户自定义各 Agent 使用的模型 | 多 LLM 支持 |
| 英文国际化 | 通用 MOBA 术语 UI | i18n 框架 |
| 对局分享 | 生成对局总结图片/链接 | 历史 + 截图 API |
| 用户手动 Gank | 拖拽小地图英雄到另一路 | Phaser 交互 |
| 战场事件播报 | "First Blood" / "Victory" 等横幅动画 | Phaser 动画系统 |
| 配置面板 UI | 可视化配置 Agent prompt、Token 预算 | Settings Webview |
| 对局回放 | 回放历史对局的英雄行动轨迹 | 历史数据 + Phaser |

---

## 5. 用户故事列表 (User Stories)

### 核心编码流程

| ID | 角色 | 用户故事 | 验收条件 | 优先级 |
|----|------|---------|---------|--------|
| US-001 | 开发者 | 我想用自然语言描述一个功能需求，让 Agent 团队自动完成编码 | Router 正确拆解任务；Scout 找到相关代码；Coder 生成可运行的代码 | P0 |
| US-002 | 开发者 | 我想看到每个 Agent 当前在做什么 | 状态栏实时显示 5 个 Agent 的状态图标 (idle/working/done/blocked) | P0 |
| US-003 | 开发者 | 我想在 Agent 编码完成后查看代码变更 | 编辑器中展示 diff 视图，支持接受/拒绝 | P0 |
| US-004 | 开发者 | 我想知道本次任务花了多少 Token | 状态栏显示 Token 消耗总数，面板展示各 Agent 分布 | P0 |
| US-005 | 开发者 | 我想让 AI 帮我修一个 Bug | 输入 bug 描述 → Router 分配 → Scout 定位 → Coder 修复 | P0 |

### 质量保障

| ID | 角色 | 用户故事 | 验收条件 | 优先级 |
|----|------|---------|---------|--------|
| US-006 | Tech Lead | 我想让 AI 写完代码后自动做 Code Review | Guardian 对 Coder 产出进行审查，输出审查报告 | P1 |
| US-007 | Tech Lead | 我想让 AI 自动为新代码生成单元测试 | Guardian 根据 diff 自动生成测试代码 | P1 |
| US-008 | Tech Lead | 如果审查发现问题，我想让 Coder 自动修改 | Guardian 打回 → Coder 根据 review 意见修正 → 再次提交审查 | P1 |
| US-009 | 开发者 | 代码修改后我想自动跑构建和测试 | Builder 自动执行 build/test 命令，解析并展示结果 | P1 |

### 可视化 & 游戏化

| ID | 角色 | 用户故事 | 验收条件 | 优先级 |
|----|------|---------|---------|--------|
| US-010 | 开发者 | 我想看到像素小人在地图上跑来跑去 | Phaser 渲染 MOBA 地图 + 5 个英雄 sprite，根据 Agent 状态移动 | P1 |
| US-011 | 开发者 | 我想点击英雄看到它的实时输出 | 点击地图英雄弹出气泡，显示实时代码流/搜索结果/审查报告 | P1 |
| US-012 | 开发者 | 我想看到任务完成时的 "Victory" 动画 | 敌方水晶爆炸 + 全屏胜利画面 + KDA 结算 | P2 |
| US-013 | 博主 | 我想截图/录屏分享我的 Agent 战绩 | 生成带段位、KDA 的对局总结图片 | P2 |
| US-014 | 开发者 | 我想看到自己的段位排名 | 段位系统 (青铜→王者)，基于历史 KDA 计算 | P2 |

### 灵活配置

| ID | 角色 | 用户故事 | 验收条件 | 优先级 |
|----|------|---------|---------|--------|
| US-015 | 开发者 | 我想选择不同的模型预设 | 支持 balanced/allstar/economy 三种模型配置 | P0 |
| US-016 | 开发者 | 我想用自己的 OpenAI API Key | LLM Adapter 支持 OpenAI 模型 | P2 |
| US-017 | 开发者 | 我想用本地模型降低成本 | 支持 Ollama 本地模型 | P2 |
| US-018 | 开发者 | 我想自定义每个 Agent 的 System Prompt | 配置面板暴露各 Agent 的 prompt 编辑 | P2 |
| US-019 | 海外用户 | 我想用英文界面 | 支持中/英文切换，MOBA 术语国际化 | P2 |

---

## 6. MVP 定义

### Phase 1 MVP 必须包含 (4-6 周)

**核心命题：证明 "多 Agent 协作比单 Agent 更好" 这件事跑得通。**

#### 必须有

- [x] VS Code 扩展骨架 + Svelte Webview 基础集成
- [x] BaseAgent 抽象类 + Agent 状态机
- [x] Router Agent：意图识别 + 任务拆解 + 执行调度
- [x] Coder Agent：接收任务 + 上下文 → 生成代码
- [x] Scout Agent：代码搜索 + 文件读取 + 上下文整理
- [x] Agent 间消息总线 (Message Bus)
- [x] LLM Adapter (Anthropic Claude API)
- [x] 状态栏实时状态显示（5 个图标 + Token 计数）
- [x] 侧边栏 Agent 状态卡片（文字版，非像素动画）
- [x] API Key 配置 + 模型预设选择
- [x] 基础 Token 追踪

#### 可以砍掉

- [ ] ~~Guardian Agent~~ → Phase 2（MVP 先跑通 Router → Scout → Coder 的最小链路）
- [ ] ~~Builder Agent~~ → Phase 2
- [ ] ~~Gank 机制~~ → Phase 2（MVP 用固定串行流程）
- [ ] ~~Phaser 像素战场~~ → Phase 2（MVP 用简单的状态卡片 + 文字输出）
- [ ] ~~KDA / 段位 / 成就~~ → Phase 3
- [ ] ~~多 LLM 支持~~ → Phase 3
- [ ] ~~国际化~~ → Phase 4
- [ ] ~~对局回放 / 分享~~ → Phase 4

#### MVP 的最小完整体验

```
用户输入："帮我写一个获取用户列表的 REST API"
  → Router 识别意图 → 拆解为 3 个子任务
  → Scout 搜索项目中已有的 API/Model 代码
  → Coder 根据上下文编写 controller + service + route
  → 状态栏全程显示进度
  → 完成后展示 diff → 用户确认
整个过程 30 秒 - 2 分钟，用户全程可观测。
```

---

## 7. 成功指标

### 北极星指标 (North Star Metric)

**周活跃对局数 (Weekly Active Sessions)**

定义：每周至少触发 1 次 "King Agents: Start New Session" 的独立用户数 x 平均对局数。

为什么选这个：
- 反映用户真正在用（不只是装了插件）
- 对局是核心价值交付单元
- 兼顾用户数和使用深度

目标节奏：
| 时间节点 | 目标 |
|---------|------|
| MVP 发布后 1 周 | 100 周活跃对局 |
| Phase 2 发布后 | 1,000 周活跃对局 |
| Phase 3 发布后 | 5,000 周活跃对局 |
| Phase 4 发布后 | 10,000+ 周活跃对局 |

### 过程指标 (Process Metrics)

| 指标 | 定义 | 目标 | 阶段 |
|------|------|------|------|
| 首次任务完成率 | 用户首次使用的任务成功率 | > 70% | MVP |
| 任务完成质量 | Guardian 审查一次通过率 | > 80% | Phase 2 |
| 安装→首次对局转化率 | 安装插件后 24h 内开始首次对局 | > 50% | MVP |
| 7 日留存率 | 安装后第 7 天仍在使用 | > 30% | Phase 2 |
| 30 日留存率 | 安装后第 30 天仍在使用 | > 15% | Phase 3 |
| 平均对局时长 | 从开局到 Victory/Defeat 的平均时间 | < 2 分钟 (简单任务) | MVP |
| Token 效率 | 每完成 1 个任务的平均 Token 消耗 | 逐版本下降 10% | 持续 |
| Marketplace 评分 | VS Code Marketplace 用户评分 | > 4.0 星 | Phase 4 |
| 社交分享率 | 使用分享功能的用户比例 | > 10% | Phase 4 |
| Bug 密度 | 每千行代码的 Bug 数 | < 2 | 持续 |

### 数据埋点计划 (仅匿名、可选、可关闭)

| 事件 | 数据点 |
|------|--------|
| session_start | 模型预设, 任务类型 |
| session_end | 完成/失败, 时长, Token 消耗, KDA |
| agent_state_change | 角色, 前状态, 后状态 |
| gank_triggered | 发起者, 目标, 原因 |
| user_intervention | 暂停/重试/取消, 哪个 Agent |
| feature_used | 像素战场/数据面板/历史/分享 |

> 注意：所有数据收集遵循 GDPR / 中国个人信息保护法，默认关闭，用户需主动 opt-in。

---

## 附录: 术语对照表

| 王者荣耀术语 | King Agents 含义 | 通用 MOBA 术语 (国际化) |
|-------------|-----------------|----------------------|
| 打野 | Router (任务调度) | Jungler |
| 中路 | Coder (核心编码) | Mid Laner |
| 对抗路 | Guardian (审查测试) | Off Laner / Top |
| 发育路 | Builder (构建部署) | Carry / ADC |
| 辅助 | Scout (搜索上下文) | Support |
| Gank | 动态支援 | Gank |
| 团战 | 多 Agent 协作解决难题 | Teamfight |
| 推塔 | 子任务完成 | Push Tower |
| 泉水 | Agent 空闲状态 | Fountain |
| KDA | 完成数/失败数/协作数 | KDA |
| 段位 | 用户累计使用评分 | Rank |
