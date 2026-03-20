# King Agents — 像素办公室 AI 编程团队

> 5 个 AI 智能体在像素风办公室里分工协作帮你写代码，实时看小人在办公室跑来跑去工作。

## 它是什么？

King Agents 是一个 VS Code / Cursor / Trae 插件。你给它一个任务（比如"给登录页加验证码"），它会派出 5 个 AI 智能体分工协作完成：

| 角色 | 做什么 | 在办公室里 |
|------|--------|-----------|
| 🗂️ **路由**（项目经理） | 拆解任务、分配工作、协调进度 | 在会议室白板上画流程图 |
| 💻 **编码**（程序员） | 写核心代码 | 在代码间疯狂敲键盘 |
| 🔍 **审查**（质检员） | 审查代码、写测试、找 bug | 在测试间拿放大镜检查 |
| ⚙️ **构建**（运维工程师） | 构建、运行测试、部署 | 在部署间盯着服务器进度条 |
| 📚 **侦查**（研究员） | 搜索代码、查文档、收集上下文 | 在资料室翻文件柜 |

最酷的是：你能在一个**像素风办公室**里看到这 5 个小人跑来跑去工作、传递文件、互相讨论。

---

## 快速开始（3 步）

### 第 1 步：安装插件

**VS Code / Cursor：**
1. 打开 VS Code
2. 按 `Ctrl+Shift+X`（Mac: `Cmd+Shift+X`）打开扩展面板
3. 搜索 `King Agents`
4. 点击「安装」

**或者手动安装 .vsix：**
```bash
code --install-extension king-agents-0.1.0.vsix
```

### 第 2 步：配置 AI 模型

在 VS Code 中按 `Ctrl+,`（Mac: `Cmd+,`）打开设置，搜索 `King Agents`。

**国内用户推荐（有免费额度）：**

| 提供商 | 申请 API Key | 说明 |
|--------|-------------|------|
| **DeepSeek**（默认） | [platform.deepseek.com](https://platform.deepseek.com/) | 注册送额度，性价比最高 |
| **通义千问** | [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com/) | 阿里云，免费额度充足 |
| **智谱 AI** | [open.bigmodel.cn](https://open.bigmodel.cn/) | 注册送额度 |
| **豆包** | [console.volcengine.com](https://console.volcengine.com/) | 字节跳动 |

**海外用户：**

| 提供商 | 申请 API Key |
|--------|-------------|
| Anthropic Claude | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI GPT | [platform.openai.com](https://platform.openai.com/) |

**不想花钱？**
- 选 `Ollama` 提供商，本地运行开源模型，完全免费
- 或者不配置 Key，直接看 Demo 模式的像素办公室动画

配置步骤：
1. **Provider**：选你的提供商（默认 DeepSeek）
2. **API Key**：粘贴你申请到的 Key
3. 其他留空即可

### 第 3 步：开始使用

1. 按 `Ctrl+Shift+P`（Mac: `Cmd+Shift+P`）打开命令面板
2. 输入 `King Agents`，你会看到这些命令：

| 命令 | 说明 |
|------|------|
| **King Agents: Start New Task (新任务)** | 开始新任务，输入你的需求 |
| **King Agents: Open Office (打开办公室)** | 打开像素办公室面板 |
| **King Agents: Cancel Session (取消任务)** | 取消当前任务 |
| **King Agents: Show Stats (统计)** | 查看历史统计 |

---

## 设置说明

在 VS Code 设置中搜索 `King Agents`：

| 设置项 | 说明 | 默认值 |
|--------|------|--------|
| `kingAgents.anthropicApiKey` | Anthropic API Key | （空，必填） |
| `kingAgents.modelPreset` | 模型配置方案 | `balanced` |
| `kingAgents.maxRetries` | 最大重试次数 | `3` |

### 模型配置方案

| 方案 | 路由/编码/审查 | 构建/侦查 | 适合 |
|------|---------------|----------|------|
| `balanced`（推荐） | Claude Opus | Claude Sonnet | 质量和速度的平衡 |
| `allstar` | 全部 Claude Opus | 全部 Claude Opus | 追求极致质量，不在乎费用 |
| `economy` | 全部 Claude Sonnet | 全部 Claude Sonnet | 省钱模式 |

---

## 像素办公室怎么看？

打开战场面板后，你会看到一个像素风办公室：

```
┌──────────┐  ┌──────────────┐  ┌──────────┐
│  会议室    │  │    代码间     │  │  测试间   │
│  路由在    │  │  编码在敲键盘  │  │ 审查在检查│
│  画流程图  │  │              │  │          │
└──────────┘  └──────────────┘  └──────────┘

              走  廊

┌──────────┐  ┌──────────────┐  ┌──────────┐
│  部署间    │  │    资料室     │  │  休息区   │
│  构建在    │  │  侦查在翻文件 │  │ 空闲的人  │
│  看进度条  │  │              │  │ 喝咖啡    │
└──────────┘  └──────────────┘  └──────────┘
```

### 操作方式

| 操作 | 方法 |
|------|------|
| 平移地图 | 鼠标拖拽 |
| 缩放 | 鼠标滚轮 |
| 重置视角 | 按空格键 |
| 查看小人详情 | 点击底部的角色卡片 |
| 切换数据面板 | 点击底部的「数据」按钮 |

### 小人会做什么？

- **空闲** → 在休息区喝咖啡、坐沙发
- **接到任务** → 起身走去对应房间
- **工作中** → 播放工作动画（敲键盘、翻文件、看放大镜等）
- **传递数据** → 抱着文件走过走廊递给同事
- **审查打回** → 文件盖红章扔回去，编码头上冒 😤
- **全部完成** → 全员在休息区击掌庆祝 🎉

---

## 费用说明

King Agents 本身**免费开源**。但使用 AI 功能需要你自己的 Anthropic API Key，按 Claude API 官方定价计费。

大致成本参考（以 balanced 模式为例）：

| 任务复杂度 | 预计消耗 | 预计费用 |
|-----------|---------|---------|
| 简单（修 typo） | ~2,000 tokens | ~$0.05 |
| 中等（加功能） | ~20,000 tokens | ~$1.00 |
| 复杂（大重构） | ~50,000 tokens | ~$3.00 |

> 提示：选 `economy` 模式（全部用 Sonnet）可以大幅降低费用。

---

## 常见问题

### Q: 支持哪些编辑器？
VS Code、Cursor、Trae，以及所有基于 VS Code 的编辑器。

### Q: 支持哪些 AI 模型？
目前支持 Anthropic Claude（Opus 和 Sonnet）。后续计划支持 OpenAI 和本地模型（Ollama）。

### Q: 不配置 API Key 能用吗？
可以看 Demo 演示（像素办公室动画），但无法执行真实的 AI 任务。

### Q: 像素小人的美术素材来源？
使用 [Pixel Agents](https://github.com/pablodelucca/pixel-agents) 项目的开源 MIT 协议素材。

### Q: 安全吗？代码会上传吗？
你的代码只发送给 Anthropic Claude API（你自己的 Key），不经过任何第三方服务器。

---

## 开发者指南

### 本地开发

```bash
# 克隆项目
git clone https://github.com/king-agents/king-agents.git
cd king-agents

# 安装依赖
npm install
cd webview-ui && npm install && cd ..

# 构建
npm run build:all

# 开发模式（前端热更新）
cd webview-ui && npm run dev

# 在 VS Code 中按 F5 启动调试
```

### 项目结构

```
king-agents/
├── src/                  # VS Code 扩展后端（TypeScript）
│   ├── agents/           # 5 个 AI Agent 实现
│   ├── runtime/          # 编排引擎、消息总线
│   ├── llm/              # LLM 适配层（Claude API）
│   └── extension.ts      # 入口
├── webview-ui/           # 前端（Svelte + Phaser）
│   ├── src/game/         # 像素办公室渲染
│   ├── src/components/   # HUD 组件
│   └── public/assets/    # 像素美术资源
└── docs/                 # 产品/商业/竞品文档
```

---

## 致谢

- 像素美术素材：[Pixel Agents](https://github.com/pablodelucca/pixel-agents)（MIT 协议）
- 游戏引擎：[Phaser 3](https://phaser.io/)
- AI 模型：[Anthropic Claude](https://www.anthropic.com/)

## 许可证

MIT License
