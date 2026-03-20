# King Agents — 项目存档

> 最后更新：2026-03-19

---

## 项目概述

**King Agents** — 像素办公室 AI 编程团队。5 个 AI 智能体在像素风办公室里分工协作帮用户写代码，实时可视化每个人的工作状态。支持 VS Code/Cursor/Trae。

- 项目路径：`/Users/carey/projects/AI_Project/king-agents/`
- Marketplace Publisher：`king-agents`（账号 xiangyuisme@outlook.com）
- 当前版本：**v0.2.0**（已发布到 VS Code Marketplace）
- 协议：MIT

---

## 5 个 Agent 角色

| 角色 | 中文名 | 职位 | 模型 | 办公室房间 |
|------|--------|------|------|-----------|
| Router | 路由 | 项目经理 | 强模型 | 会议室 |
| Coder | 编码 | 程序员 | 强模型 | 代码间 |
| Guardian | 审查 | 质检员 | 强模型 | 测试间 |
| Builder | 构建 | 运维工程师 | 轻模型 | 部署间 |
| Scout | 侦查 | 研究员 | 轻模型 | 资料室 |

---

## 技术栈

- **后端**：TypeScript + esbuild，VS Code Extension API
- **前端**：Svelte 5 + Phaser 3（像素游戏引擎）+ Tailwind CSS
- **LLM**：8 个提供商（Anthropic / OpenAI / DeepSeek / 豆包 / 千问 / 智谱 / OpenAI兼容 / Ollama）
- **像素素材**：Pixel Agents 开源项目 MIT 协议（角色 sprite sheet、地砖、家具 PNG）

---

## 项目结构

```
king-agents/
├── src/                  # VS Code 扩展后端
│   ├── agents/           # 5 个 Agent (base-agent, router, coder, guardian, builder, scout)
│   ├── runtime/          # orchestrator, message-bus, game-state-manager
│   ├── llm/              # adapter, anthropic, openai, openai-compatible, ollama
│   ├── config/           # defaults, prompts/
│   └── extension.ts
├── webview-ui/           # 前端 (Svelte + Phaser)
│   ├── src/game/         # OfficeMap, OfficeScene, Worker, Furniture, EventToast
│   ├── src/components/   # HUD, WorkerBubble, CompletionScreen, DataPanel
│   ├── src/stores/       # gameState
│   ├── src/lib/          # constants, types, vscode-bridge
│   └── public/assets/    # characters/, floors/, furniture/, walls/
├── docs/                 # PRD, BUSINESS, LAUNCH, COMPETITIVE-ANALYSIS 等 7 个文档
├── resources/            # icon.png, icon.svg
└── package.json
```

---

## 版本历史

### v0.1.0 (2026-03-17)
- 项目脚手架 + 5 个 Agent 核心运行时
- Anthropic Claude LLM 适配层
- 前端像素办公室（Phaser + Svelte）
- 7 个产品/技术文档
- 首次发布到 VS Code Marketplace

### v0.2.0 (2026-03-19)
- 多模型支持：8 个 AI 提供商（含国内 DeepSeek/豆包/千问/智谱）
- 像素办公室重写：从 MOBA 地图 → 办公室，从程序化绘图 → 真实 PNG sprite
- 全中文 UI + 暖色温馨画风 + 自适应字体
- 小人移动速度和动画优化

---

## 设计决策记录

1. **最初考虑 MOBA 地图（王者荣耀五排）** → 用户觉得无聊 → 改为像素办公室
2. **不限制 Token**，核心三人（Router/Coder/Guardian）用最强模型
3. **像素素材**：Pixel Agents 项目 MIT 协议
4. **国内模型**：全部用 OpenAI 兼容格式，纯 fetch 不依赖额外 SDK
5. **Marketplace 发布**：网页上传 .vsix（非 CLI），Publisher ID = `king-agents`

---

## 踩坑记录

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| Svelte 模板显示 `\u9879\u76EE` 乱码 | `\uXXXX` 在 Svelte HTML 中不解析 | 直接写中文字符，不用转义 |
| 小人移动闪烁抖动 | sin() 弹跳在 onUpdate 每帧改 y | 删掉 sin 弹跳，速度降到 55px/s，用 Sine.easeInOut |
| 文字看不清 | 像素字体 5-7px 太小 | CSS clamp() 变量做自适应，最小 8px |
| vsce 打包报 SVG icon 错误 | Marketplace 不支持 SVG icon | sips 转换为 256x256 PNG |
| Azure DevOps 页面 vs Azure Portal | dev.azure.com ≠ portal.azure.com | 直接用 marketplace.visualstudio.com/manage |
| Vite 版本冲突 | vite@6 与 @sveltejs/vite-plugin-svelte@4 不兼容 | 降级 vite 到 ^5.4.0 |

---

## 待办 / 下一步

- [ ] **前后端对接**：目前前端只有 Demo 模式，Agent Runtime 还没连接到真实 LLM 调用
- [ ] 真实任务执行流程端到端跑通
- [ ] Open VSX 发布（覆盖 Trae）
- [ ] 更多像素素材定制（专属角色形象）
- [ ] 对局历史存储
- [ ] 新手引导（引导用户选择提供商和填 Key）
- [ ] GitHub 仓库创建 + README 截图/GIF
- [ ] 性能测试和优化

---

## 常用命令

```bash
# 开发
cd /Users/carey/projects/AI_Project/king-agents
cd webview-ui && npm run dev          # 前端热更新预览
npx tsc --noEmit                      # 后端类型检查
npm run build:all                     # 全量构建

# 打包发布
npx @vscode/vsce package --allow-missing-repository
# 然后去 https://marketplace.visualstudio.com/manage 上传 .vsix
```
