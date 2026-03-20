# Changelog

All notable changes to the King Agents extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.2.0] - 2026-03-19

### Added
- **多模型支持**: 新增 8 个 AI 提供商
  - Anthropic Claude (Opus / Sonnet)
  - OpenAI GPT (GPT-4o / GPT-4o-mini)
  - DeepSeek 深度求索
  - 豆包 (字节跳动)
  - 通义千问 (阿里云)
  - 智谱 AI
  - OpenAI 兼容接口 (自定义地址)
  - Ollama 本地模型 (无需 API Key)
- **像素办公室可视化**: 真实像素 sprite 角色 + 家具 + 动画
- **全中文界面**: 所有 UI 文字中文化
- **暖色温馨画风**: 参考 LimeZu 风格，6 个房间各有不同颜色地毯
- **自适应字体**: 文字大小随窗口自适应

### Changed
- 统一配置项: `kingAgents.provider` + `kingAgents.apiKey` 替代旧的 `anthropicApiKey`
- 国内提供商使用纯 fetch 实现，不依赖额外 SDK

---

## [0.1.0] - 2026-03-17

### Added
- **VS Code 扩展骨架**: 基于 esbuild 的构建流程，Svelte Webview 集成
- **Agent 基类 (BaseAgent)**: 统一的状态机、生命周期管理、Token 追踪
- **Router Agent (打野)**: 意图识别、任务拆解、执行调度
- **Coder Agent (中路)**: 核心编码能力，接收上下文生成代码
- **Scout Agent (辅助)**: 代码搜索、文件读取、上下文收集
- **Agent 消息总线 (Message Bus)**: Agent 间通信机制
- **LLM Adapter (Anthropic)**: Claude API 调用封装，支持 Opus 4.6 和 Sonnet 4.6
- **状态栏视图**: 底部状态栏显示 5 个 Agent 实时状态图标
- **侧边栏面板**: Agent 状态卡片 + 小地图 Webview 容器
- **Token 管理器**: 各 Agent Token 消耗追踪与统计
- **模型预设**: balanced (Opus+Sonnet) / allstar (全 Opus) / economy (全 Sonnet) 三种预设
- **配置项**: API Key、模型预设、最大重试次数
- **4 个核心命令**:
  - `King Agents: Start New Session (开局)`
  - `King Agents: Open Battlefield (打开战场)`
  - `King Agents: Cancel Session (投降)`
  - `King Agents: Show Stats (战绩)`

### Technical
- 最低 VS Code 版本: 1.85.0
- 构建工具: esbuild
- 前端框架: Svelte 5
- LLM SDK: @anthropic-ai/sdk ^0.39.0
- TypeScript ^5.5.0

---

[Unreleased]: https://github.com/king-agents/king-agents/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/king-agents/king-agents/releases/tag/v0.1.0
