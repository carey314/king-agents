# King Agents 深度竞品分析报告

> 调研日期：2026-03-17
> 调研范围：直接竞品（多 Agent IDE 插件）+ 间接竞品（多 Agent 框架）
> 数据来源：公开市场数据、GitHub、VS Code Marketplace、官方文档

---

## 一、直接竞品分析（多 Agent IDE 插件）

### 1.1 Pixel Agents — 像素办公室

**基本信息**

| 维度 | 详情 |
|------|------|
| 开发者 | Pablo De Lucca（个人开源项目） |
| 发布时间 | 2026 年 2 月 24 日 |
| GitHub Stars | 4,600+ |
| VS Code 安装量 | 未公开具体数字（Marketplace 上架） |
| 许可证 | MIT |
| 最新版本 | v1.1.1 (2026-03-14) |

**技术栈**

- 前端渲染：React 19 + Canvas 2D（非游戏引擎）
- 后端：TypeScript + VS Code Webview API
- 构建工具：esbuild + Vite
- 渲染方式：轻量级游戏循环 + Canvas 2D 渲染 + BFS 寻路 + 角色状态机
- Agent 检测：监控 Claude Code 的 JSONL 日志文件

来源：[GitHub - pablodelucca/pixel-agents](https://github.com/pablodelucca/pixel-agents)

**核心功能**

- 将 AI 编码 Agent 转化为像素风格的办公室角色
- 实时活动追踪：角色根据 Agent 状态改变动画（打字、阅读、等待）
- 可定制办公室布局编辑器（墙壁自动贴图、家具放置）
- 6 个预设像素角色，支持自定义精灵图
- 点击 Agent 可查看模型、分支、系统提示词和完整工作历史
- Token 健康条（上下文窗口/速率限制可视化）
- 语音通知（可选）
- 子 Agent 可视化

来源：[Fast Company 报道](https://www.fastcompany.com/91497413/this-charming-pixel-art-game-solves-one-of-ai-codings-most-annoying-ux-problems)

**优劣势分析**

| 优势 | 劣势 |
|------|------|
| 首创像素风 Agent 可视化概念，市场认知度高 | 仅支持 Claude Code，Agent 覆盖面窄 |
| 开源 MIT 许可，社区贡献活跃（655 forks） | Canvas 2D 渲染，无游戏引擎支持，动画能力有限 |
| 办公室主题直觉化，开发者易理解 | 纯可视化工具，不涉及 Agent 调度/协作逻辑 |
| 轻量级实现，性能占用低 | 无游戏化机制（无成就、段位、经济系统） |
| 模块化架构设计，远景规划为全平台支持 | 目前仅为"观察者"，无法干预 Agent 行为 |

**King Agents 差异化机会**

1. **深度 vs 表层**：Pixel Agents 只是"看"Agent 干活，King Agents 是"指挥"Agent 协作
2. **游戏引擎 vs Canvas**：King Agents 使用 Phaser 3，能实现更丰富的 MOBA 地图、粒子特效、路径动画
3. **MOBA 主题 vs 办公室主题**：王者荣耀的分路机制天然映射多 Agent 协作模式，比办公室隐喻更有游戏感
4. **游戏化系统**：KDA、段位、推塔进度、战场播报等完整游戏化体验
5. **多模型调度**：King Agents 内置 5 Agent 协作调度，而非仅观察外部 Agent

---

### 1.2 Roo Code — 多 Agent 编码团队

**基本信息**

| 维度 | 详情 |
|------|------|
| 开发者 | Roo Code, Inc.（商业公司） |
| VS Code 安装量 | 1,200,000+（Marketplace） |
| GitHub Stars | 22,000+ |
| 贡献者数量 | 300+ |
| 许可证 | Apache 2.0 |
| 定价 | 免费开源 / Pro $20/月 / Team $99/月 |

**核心功能**

- 五种内置模式：Code、Architect、Ask、Debug、Custom
- Mode Gallery：社区发布预测试配置
- 云 Agent（Cloud Agents）：支持从 Web/Slack/GitHub 远程委派任务
- 多模型支持：接入各种 LLM API（自带 API Key 或用 Roo 提供商）
- SOC 2 Type 2 合规，企业级安全

来源：[Roo Code 官网](https://roocode.com/)，[Roo Code VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=RooVeterinaryInc.roo-cline)

**定价详情**

| 计划 | 价格 | 功能 |
|------|------|------|
| 开源免费 | $0 | 完整 VS Code 扩展功能 |
| Pro | $20/月 + $5/小时云任务 | 云 Agent（PR Reviewer）、远程任务控制 |
| Team | $99/月 | 集中计费、团队管理、角色权限 |

**优劣势分析**

| 优势 | 劣势 |
|------|------|
| 从 Cline 分叉发展，技术积累深厚 | 无可视化界面，纯文本交互 |
| 完整商业模式，有融资和企业支持 | "模式"非真正多 Agent 协作，更像单 Agent 角色切换 |
| 社区模式画廊，生态丰富 | 云 Agent 按小时收费，成本不透明 |
| SOC 2 合规，企业客户信赖 | 无游戏化元素，使用体验传统 |

**King Agents 差异化机会**

1. **真多 Agent vs 模式切换**：Roo 的五种模式本质是单 Agent 角色切换，King Agents 是五个独立 Agent 并行协作
2. **可视化优势**：完整的 MOBA 战场可视化，远超纯文本界面
3. **动态调度 vs 静态模式**：King Agents 的 Gank 机制实现 Agent 间实时支援

---

### 1.3 Cline — 自主编码 Agent

**基本信息**

| 维度 | 详情 |
|------|------|
| 开发者 | Cline AI |
| VS Code 安装量 | 5,000,000+ |
| 评分 | 4.0-4.32 星（264 评分） |
| 许可证 | Apache 2.0 |
| 定价 | 开源免费（用户自付 API 费用） |

**核心功能**

- 自主编码 Agent：文件创建/编辑、命令执行、浏览器自动化
- 双模式设计：Plan 模式（规划）+ Act 模式（执行）
- Human-in-the-loop：每步操作需用户批准
- MCP（Model Context Protocol）工具集成
- 全项目代码搜索和终端命令执行
- 模型无关：支持各种 LLM API

来源：[Cline 官网](https://cline.bot/)，[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev)

**优劣势分析**

| 优势 | 劣势 |
|------|------|
| 市场份额最大（5M+ 安装） | 单 Agent 架构，无多 Agent 协作 |
| 完全开源，社区活跃 | 无可视化界面 |
| Plan+Act 双模式设计成熟 | 每步审批可能降低效率 |
| MCP 工具生态丰富 | 无游戏化元素 |

**King Agents 差异化机会**

1. **多 Agent 协作 vs 单 Agent**：五人战队 vs 单兵作战
2. **可视化 + 游戏化**：完整的 MOBA 战场体验
3. **自动化程度更高**：Router 自动调度，减少用户审批频率

---

### 1.4 VS Code Multi-Agent（官方 Copilot Agent 体系）

**基本信息**

| 维度 | 详情 |
|------|------|
| 开发者 | Microsoft / GitHub |
| 发布 | VS Code 1.109 (2026-01) 引入统一 Agent 体验 |
| 支持的 Agent | GitHub Copilot、Copilot Coding Agent、Claude、OpenAI Codex |
| 定价 | Copilot Pro $10/月、Copilot Business $19/月 |

**核心功能**

- 统一 Agent Sessions 管理：在 VS Code 侧边栏管理所有本地和远程 Agent
- 多 Agent 并行运行：Claude、Codex 可与 Copilot 同时工作
- 本地 Agent + 云 Agent 混合架构
- Agent Mode：自主编码、多步骤任务、终端命令执行
- MCP（Model Context Protocol）原生支持

来源：[VS Code Multi-Agent Blog](https://code.visualstudio.com/blogs/2026/02/05/multi-agent-development)，[VS Code Agent Docs](https://code.visualstudio.com/docs/copilot/agents/overview)

**限制**

- Agent 之间无真正的协作机制（各自独立工作，用户手动协调）
- 无可视化/游戏化界面
- Agent Sessions 更像任务管理器而非协作平台
- 依赖微软生态，灵活性受限

**King Agents 差异化机会**

1. **协作 vs 并行**：VS Code 官方方案是"多个 Agent 各干各的"，King Agents 是"Agent 间有通信和协作"
2. **完整的游戏化体验**：推塔进度、KDA、段位系统
3. **内建调度引擎**：Router 自动分配任务，无需用户手动协调

---

### 1.5 ChatDev 2.0 — 多 Agent 软件开发

**基本信息**

| 维度 | 详情 |
|------|------|
| 开发者 | OpenBMB（清华系） |
| 发布时间 | 2026 年 1 月 7 日（2.0 正式版） |
| GitHub Stars | 26,000+ |
| 学术论文 | NeurIPS 2025 接收 |
| 许可证 | Apache 2.0 |

**核心功能（2.0 版本）**

- 零代码多 Agent 编排平台（拖拽式工作流画布）
- MacNet：支持 DAG 拓扑，打破 1.0 的线性链式约束
- 三大核心模块：Tutorial（教程）、Workflow Canvas（工作流画布）、Launch（实时监控）
- 支持 Human-in-the-loop 交互
- 应用场景扩展：数据分析、3D 资产创建、深度研究、游戏开发
- Puppeteer 范式：可学习的中央编排器 + 强化学习优化

来源：[GitHub - OpenBMB/ChatDev](https://github.com/OpenBMB/ChatDev)，[x-cmd Blog](https://www.x-cmd.com/blog/260110/)

**优劣势分析**

| 优势 | 劣势 |
|------|------|
| 学术基础扎实（NeurIPS 2025） | 非 IDE 插件，独立 Web 平台 |
| DAG 拓扑支持大规模 Agent 协作 | 使用门槛较高，需配置工作流 |
| 零代码拖拽式编排 | 无实时可视化（只有监控面板） |
| 不限于软件开发场景 | 中国团队开发，国际化有限 |

**King Agents 差异化机会**

1. **IDE 原生 vs Web 平台**：King Agents 直接嵌入 VS Code，无需切换环境
2. **即开即用 vs 配置编排**：预设 5 Agent 角色，用户开箱即用
3. **游戏化体验**：ChatDev 偏学术和工具化，缺乏趣味性

---

## 二、间接竞品分析（多 Agent 框架）

### 2.1 CrewAI

**基本信息**

| 维度 | 详情 |
|------|------|
| 最新稳定版 | v1.9.3 (2026-01-30) |
| 预发布版 | v1.10.0a1 (2026-02-19) |
| 编程语言 | Python |
| 许可证 | MIT |

**最新功能**

- 原生 A2A（Agent-to-Agent）异步链
- A2A 更新机制：poll/stream/push 模式
- HITL（Human-in-the-loop）全局流配置
- 流式工具调用事件
- 生产就绪的 Flows + Crews 架构
- 2026 Q1 路线图：向量数据库集成记忆系统、自动并行任务处理

来源：[CrewAI GitHub Releases](https://github.com/crewAIInc/crewAI/releases)，[CrewAI Docs](https://docs.crewai.com/en/changelog)

**与 King Agents 的关系**

CrewAI 是后端框架，King Agents 可以参考其 Crews 概念但需自建 TypeScript 运行时。CrewAI 的 A2A 通信模式可作为 King Agents 消息总线设计的参考。

---

### 2.2 Microsoft AutoGen / Agent Framework

**基本信息**

| 维度 | 详情 |
|------|------|
| 最新版本 | AutoGen v0.4（完全重构） |
| 后续方向 | Microsoft Agent Framework（2026 Q1 GA） |
| 编程语言 | Python, .NET, Java（计划） |
| 许可证 | MIT |

**最新动态**

- AutoGen v0.4：异步、事件驱动架构，支持跨语言 Agent 互操作
- 微软战略转型：AutoGen + Semantic Kernel 合并为 Microsoft Agent Framework
- AutoGen/SK 进入维护模式，新功能仅在 Agent Framework 发布
- 目标：2026 Q1 GA，包含生产 SLA、多语言支持、Azure 深度集成

来源：[Microsoft Agent Framework Overview](https://learn.microsoft.com/en-us/agent-framework/overview/)，[Azure Blog](https://azure.microsoft.com/en-us/blog/introducing-microsoft-agent-framework/)

**与 King Agents 的关系**

Microsoft Agent Framework 定位企业级后端，King Agents 定位开发者工具前端。两者可互补而非竞争。King Agents 可参考其事件驱动架构设计消息总线。

---

### 2.3 LangGraph

**基本信息**

| 维度 | 详情 |
|------|------|
| 最新版本 | v1.1（2025 年末） |
| 1.0 发布时间 | 2025 年 10 月 |
| 编程语言 | Python, JavaScript |
| 许可证 | MIT |

**最新能力**

- 持久状态持久化：Agent 中断后自动恢复执行
- First-Class Human-in-the-loop：原生 API 支持暂停/审批/修改
- Type-Safe Streaming v2：全类型安全的流式输出
- 延迟节点执行：等待所有并行分支完成后再执行
- 动态工具调用：工作流不同阶段使用不同工具集
- 任务缓存：基于节点输入的计算缓存
- 跨线程记忆：Python 和 JavaScript 均支持

来源：[LangGraph 官网](https://www.langchain.com/langgraph)，[GitHub Releases](https://github.com/langchain-ai/langgraph/releases)

**与 King Agents 的关系**

LangGraph 的图执行模型（DAG）与 King Agents 的 task-graph.ts 设计理念一致。可参考其 Human-in-the-loop 和状态持久化方案。LangGraph 有 JavaScript 版本，技术上可作为 King Agents 的底层编排引擎候选。

---

## 三、功能对比总表

| 功能维度 | King Agents | Pixel Agents | Roo Code | Cline | VS Code Agent | ChatDev 2.0 |
|---------|-------------|-------------|----------|-------|--------------|-------------|
| **多 Agent 协作** | 5 Agent 深度协作 | 仅观察 | 模式切换（单 Agent） | 单 Agent | 多 Agent 并行（无协作） | DAG 拓扑协作 |
| **Agent 间通信** | 消息总线 + Gank 机制 | 无 | 无 | 无 | 无 | DAG 拓扑 |
| **可视化** | MOBA 像素战场（Phaser） | 像素办公室（Canvas 2D） | 无 | 无 | Agent Sessions 面板 | Web 监控面板 |
| **游戏化** | KDA/段位/推塔/播报 | 无 | 无 | 无 | 无 | 无 |
| **运行环境** | VS Code 插件 | VS Code 插件 | VS Code 插件 | VS Code 插件 | VS Code 内置 | 独立 Web 平台 |
| **LLM 支持** | Claude/OpenAI/Ollama | 依赖 Claude Code | 多模型 | 多模型 | Copilot + Claude + Codex | 多模型 |
| **开源** | 是 | 是 (MIT) | 是 (Apache 2.0) | 是 (Apache 2.0) | 部分 | 是 (Apache 2.0) |
| **Token 经济可视化** | 完整经济面板 | Token 健康条 | 基础追踪 | 无 | 无 | 无 |
| **用户干预** | 暂停/重试/拖拽 Gank | 点击查看/中断 | 审批模式 | 每步审批 | 会话管理 | HITL |
| **任务进度可视化** | 推塔进度（9 塔制） | 状态指示 | 无 | Plan 模式 | 无 | 工作流画布 |
| **历史回放** | 对局历史 + MVP 结算 | 工作历史 | 无 | 对话历史 | 会话历史 | 无 |

---

## 四、市场格局总结

### 4.1 当前竞争态势

```
                    多 Agent 协作深度
                         ↑
                         │
              ChatDev 2.0│    ★ King Agents (目标位置)
                         │
                         │
         Pixel Agents    │
         (仅观察)        │
    ─────────────────────┼──────────────────────→ 可视化/游戏化程度
                         │
              Cline      │   Roo Code
              (单Agent)  │   (模式切换)
                         │
          VS Code Agent  │
          (多Agent无协作) │
```

### 4.2 King Agents 的核心差异化定位

1. **唯一的 MOBA 主题 Agent 协作可视化**：市场上无直接竞品
2. **真正的多 Agent 协作引擎**：不是模式切换，不是简单并行，而是带通信和动态调度的协作
3. **完整游戏化体系**：KDA、段位、推塔进度、战场播报 --- 提升使用粘性
4. **开发者共鸣**：王者荣耀在中国开发者群体中有极高认知度
5. **Token 经济直觉化**：用游戏经济系统映射 Token 消耗，降低理解门槛

### 4.3 潜在风险

| 风险 | 说明 | 应对策略 |
|------|------|---------|
| Pixel Agents 先发优势 | 已建立"像素 Agent 可视化"品类认知 | 强调 MOBA 协作 vs 办公室观察的本质差异 |
| VS Code 官方 Agent 体系扩展 | 微软可能增加 Agent 协作功能 | 游戏化是官方不太可能做的差异化方向 |
| Roo Code 商业化推进 | 有资金和团队优势 | 开源 + 游戏化体验是独特壁垒 |
| 用户对"游戏化"的接受度 | 部分企业用户可能觉得不严肃 | 提供"专业模式"（简洁 UI）和"游戏模式"（完整体验）双模式 |

---

## 五、间接竞品框架对比表

| 维度 | CrewAI | AutoGen/MS Agent Framework | LangGraph |
|------|--------|---------------------------|-----------|
| **语言** | Python | Python/.NET/Java | Python/JavaScript |
| **最新版本** | v1.9.3 | v0.4 / Agent Framework Q1 2026 GA | v1.1 |
| **架构模型** | Crews + Flows | 事件驱动 + 异步消息 | 图（DAG）执行 |
| **A2A 通信** | 原生 A2A 链 | 异步消息 | 图节点通信 |
| **HITL 支持** | 全局 Flow 配置 | 事件处理器 | First-Class API |
| **状态持久化** | 基础 | 计划中 | 原生支持 |
| **流式输出** | 工具调用事件流 | 事件流 | Type-Safe v2 |
| **记忆系统** | 2026 Q1 向量 DB | 计划中 | 跨线程记忆 |
| **适合 King Agents** | 概念参考 | 架构参考 | 可作为编排引擎候选（有 JS 版） |

---

## 六、结论与建议

### King Agents 应重点关注的方向

1. **与 Pixel Agents 的差异化沟通**：明确传达"不只是看，而是指挥协作"的核心价值
2. **参考 LangGraph 的图执行模型**：TypeScript 实现任务 DAG，支持持久状态和 HITL
3. **借鉴 Roo Code 的商业模式**：开源免费 + 云服务增值
4. **学习 ChatDev 2.0 的学术沉淀**：关注其 NeurIPS 论文中的编排优化算法
5. **填补市场空白**：目前没有任何产品同时提供"多 Agent 深度协作"+"游戏化可视化"+"IDE 原生体验"

### 优先级建议

- **P0（必做）**：五 Agent 协作引擎 + MOBA 战场可视化
- **P1（重要）**：Token 经济面板 + 游戏化系统（KDA/段位/推塔）
- **P2（加分）**：多 LLM 支持 + 对局历史回放
- **P3（远期）**：社区 Agent 模板 + 国际化（MOBA 通用术语）
