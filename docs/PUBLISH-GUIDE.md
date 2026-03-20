# King Agents — VS Code Marketplace 发布指南

## 当前状态

- 版本: v0.2.2
- 已构建 .vsix: king-agents-0.2.2.vsix (1MB)
- 代码: https://github.com/carey314/king-agents
- Publisher ID (package.json): "king-agents"

## 发布步骤

### 1. 创建 Azure DevOps 账号 + PAT

1. 访问 https://dev.azure.com/
2. 用 Microsoft 账号登录（可用 GitHub 账号关联）
3. 创建 Personal Access Token (PAT):
   - 右上角用户图标 → Personal Access Tokens → New Token
   - Organization: All accessible organizations
   - Scopes: 勾选 "Marketplace" → "Manage"
   - 过期时间选长一点（90天）
4. **保存好 PAT，只显示一次！**

### 2. 创建 Publisher

1. 访问 https://marketplace.visualstudio.com/manage
2. 用同一个 Microsoft 账号登录
3. 创建 Publisher:
   - Publisher ID: `king-agents` （必须与 package.json 中的 publisher 一致）
   - Display Name: `King Agents`
4. 如果 `king-agents` 已被占用，需要修改 package.json 中的 publisher 值

### 3. 安装 vsce 并发布

```bash
# 安装 vsce（VS Code Extension 发布工具）
npm install -g @vscode/vsce

# 登录
vsce login king-agents
# 输入上面创建的 PAT

# 方式A：直接发布（会自动构建）
cd /Users/carey/projects/AI_Project/king-agents
vsce publish

# 方式B：上传已有的 .vsix
vsce publish --packagePath king-agents-0.2.2.vsix
```

### 4. 手动上传（备选）

如果命令行遇到问题，可以手动上传：
1. 访问 https://marketplace.visualstudio.com/manage
2. 点击你的 Publisher
3. 点击 "New Extension" → "Visual Studio Code"
4. 上传 `king-agents-0.2.2.vsix`
5. 等待审核（通常几分钟到几小时）

## 发布前检查

- [x] README.md 内容丰富（已有详细中文说明）
- [x] CHANGELOG.md 已维护
- [x] LICENSE 文件存在（MIT）
- [x] icon.png 存在（128x128+）
- [x] package.json 中 repository/homepage/bugs 已配置
- [x] .vscodeignore 已配置（排除不必要文件）
- [ ] publisher ID 在 Marketplace 上已创建
- [ ] PAT 已获取

## 发布后推广

1. **VS Code Marketplace 优化**:
   - 确保 README 中有截图/GIF
   - 关键词已优化（AI, coding-assistant, deepseek 等）

2. **社交媒体**:
   - GitHub README 加星标引导
   - 知乎/掘金/CSDN 发技术文章
   - B站发演示视频
   - ProductHunt 发布（面向海外）

3. **开源社区**:
   - 提交到 awesome-vscode-extensions 列表
   - Reddit r/vscode 发帖
   - HackerNews Show HN

## 变现思路

VS Code Marketplace 不支持直接付费，但可以：

1. **Freemium 模式**:
   - 免费版：基础功能 + 每天限额
   - Pro版：通过外部支付（Gumroad/Stripe）解锁
   - 许可证验证在扩展内实现

2. **增值服务**:
   - 提供 AI API 中转服务（包月）
   - 自定义 Agent 模板市场
   - 企业版（团队协作功能）

3. **流量变现**:
   - 引流到付费课程/教程
   - 推广合作伙伴（AI服务商）
