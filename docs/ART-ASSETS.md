# King Agents 像素美术资源清单

> 文档日期：2026-03-17
> 适用范围：King Agents 项目所有像素美术资产的规划、来源和预算

---

## 一、可用的免费/开源像素 Tileset 资源

### 1.1 MOBA 风格地图相关资源

由于市场上没有直接的"MOBA 地图"像素 Tileset，需要从多个 Top-Down RPG/Arena 风格资源中组合。以下是经调研的最佳候选：

| 资源名称 | 来源 | 规格 | 许可证 | 适用元素 | 链接 |
|---------|------|------|--------|---------|------|
| **Pixel Art Top Down Basic** (Cainos) | itch.io | 32x32 | 免费商用 | 草地、树木、水面基础地砖 | [链接](https://cainos.itch.io/pixel-art-top-down-basic) |
| **Top-Down RPG 16x16 Pack** (Anokolisa) | itch.io | 16x16 | 免费（查看许可） | 500+ 精灵、3 英雄、8 敌人、50 武器 | [链接](https://anokolisa.itch.io/free-pixel-art-asset-pack-topdown-tileset-rpg-16x16-sprites) |
| **Cursed Land Top-Down Tileset** | itch.io | 16x16 | 免费 | 暗色调地图、城堡、防御建筑 | [链接](https://free-game-assets.itch.io/free-cursed-land-top-down-pixel-art-tileset) |
| **Top-Down RPG Pixel Art** | OpenGameArt | 多种 | CC0/CC-BY | 多种环境地砖 | [链接](https://opengameart.org/content/top-down-rpg-pixel-art) |
| **Forest Tileset 16x16** | OpenGameArt | 16x16 | CC0 | 森林/野区素材 | [链接](https://opengameart.org/content/free-sample-16x16-pixel-forest-tileset-%E2%80%93-top-down-rpg-style) |
| **Top-Down Tileset 系列** | CraftPix | 多种 | 免费/付费 | 高质量 Top-Down 环境（包含 PNG 格式） | [链接](https://craftpix.net/categorys/top-down-tilesets/) |

来源：[itch.io 像素美术资产](https://itch.io/game-assets/free/tag-pixel-art)，[CraftPix 免费资产](https://craftpix.net/freebies/)，[OpenGameArt](https://opengameart.org/)

### 1.2 资源使用注意事项

1. **尺寸统一**：项目设计为 32x32，部分 16x16 资源需要 2x 放大或重新绘制
2. **许可证审查**：每个资源使用前必须确认许可证是否允许商用
3. **风格一致性**：混用不同作者的资源可能导致风格不一致，建议用 PixelLab AI 统一风格
4. **Tiled 兼容性**：确保资源为 PNG 格式并能导入 Tiled Map Editor

---

## 二、像素角色生成工具推荐

### 2.1 专业创作工具

| 工具 | 定位 | 价格 | 平台 | 推荐指数 |
|------|------|------|------|---------|
| **[Aseprite](https://www.aseprite.org/)** | 专业像素美术编辑器 | $19.99（一次性） | Win/Mac/Linux | 强烈推荐 |
| **[LibreSprite](https://libresprite.github.io/)** | Aseprite 开源分叉 | 免费 | Win/Mac/Linux | 推荐（预算有限时） |
| **[Tiled Map Editor](https://www.mapeditor.org/)** | 地图编辑器 | 免费开源 | Win/Mac/Linux | 强烈推荐（地图必备） |
| **[Piskel](https://www.piskelapp.com/)** | 在线像素编辑器 | 免费 | Web | 推荐（快速原型） |

### 2.2 AI 辅助生成工具

| 工具 | 特点 | 价格 | 推荐用途 |
|------|------|------|---------|
| **[PixelLab](https://www.pixellab.ai/)** | 专为游戏设计：角色生成、4/8 方向变体、骨骼动画、Tileset 生成、Aseprite 插件 | 付费（有免费层） | 英雄角色生成 + 方向变体 + Tileset |
| **[PixelBox](https://llamagen.ai/ai-pixel-art-generator)** | 图片转像素动画精灵表 | 免费 | 快速将概念图转为像素精灵 |
| **[Perchance Pixel Art](https://perchance.org/ai-pixel-art-generator)** | 文本生成像素角色 | 免费，无需注册 | 概念探索、角色原型 |
| **[Pixa Sprite Generator](https://www.pixa.com/create/sprite-generator)** | AI 精灵生成，高清无水印 | 免费层 | 角色立绘生成 |
| **[Imagine Art](https://www.imagine.art/features/ai-pixel-art-generator)** | 精灵、场景、Tileset AI 生成 | 免费层 | 地图场景探索 |
| **[Sprite-AI](https://www.sprite-ai.art/)** | 专注游戏精灵生成 | 付费 | 高质量精灵 sheet |

来源：[7 Best Pixel Art Generators in 2026](https://www.sprite-ai.art/blog/best-pixel-art-generators-2026)，[PixelLab Review](https://www.jonathanyu.xyz/2025/12/31/pixellab-review-the-best-ai-tool-for-2d-pixel-art-games/)

### 2.3 推荐工作流

```
概念设计
    │
    ▼
PixelLab AI 生成初版角色（文本提示 + 风格参考图）
    │
    ├── 自动生成 4/8 方向变体
    │
    ▼
Aseprite 精修 + 动画帧制作
    │
    ├── 使用 PixelLab Aseprite 插件加速
    │
    ▼
导出 Sprite Sheet (PNG + JSON)
    │
    ▼
Phaser 加载并使用
```

---

## 三、需要定制的美术资产清单

### 3.1 五个英雄角色

每个英雄需要 32x32 像素，包含以下动画帧：

| 动画 | 帧数 | 说明 |
|------|------|------|
| idle_down / up / left / right | 4 x 4 | 四方向待机 |
| walk_down / up / left / right | 6 x 4 | 四方向行走 |
| work | 8 | 工作动画（角色特有） |
| skill | 6 | 释放技能特效 |
| hit | 4 | 被击中/出错 |
| victory | 6 | 胜利庆祝 |
| recall | 8 | 回城传送 |
| dash | 4 | 冲刺（gank 用） |

**每英雄约 72 帧，5 英雄共约 360 帧**

#### 英雄设计规格

| 英雄 | 角色定位 | 外观设计 | 配色方案 |
|------|---------|---------|---------|
| **Router（打野）** | 影·刺客 | 黑色斗篷，手持双刀 | 深紫 + 暗绿 |
| **Coder（中路）** | 咒·法师 | 蓝紫色法袍，法杖/键盘权杖 | 宝蓝 + 金色 |
| **Guardian（对抗路）** | 盾·战士 | 重甲骑士，盾牌 + 放大镜 | 银白 + 红色 |
| **Builder（发育路）** | 弓·射手 | 轻甲弓箭手，背工具箱 | 橙色 + 棕色 |
| **Scout（辅助）** | 灵·仙子 | 发光小精灵，环绕小星星 | 淡蓝 + 白色 + 发光粒子 |

### 3.2 地图资产

| 资产 | 规格 | 数量 | 说明 |
|------|------|------|------|
| **地图 Tileset** | 32x32 per tile | ~100 块 | 草地、路面、河道、树木、草丛 |
| **己方水晶** | 64x64 | 1 | 蓝色像素城堡（带发光动画） |
| **敌方水晶** | 64x64 | 1 | 红色像素城堡（带发光动画） |
| **防御塔** | 32x48 | 9 个（3路x3塔） | 像素炮塔，需要完好/损坏/摧毁三种状态 |
| **泉水传送阵** | 64x64 | 1 | 发光传送阵动画（8 帧循环） |
| **草丛** | 32x32 | 多个 | 绿色摇晃动画（4 帧循环） |
| **河道** | 32x32 | 多个 | 水面流动动画 |

### 3.3 野怪与 Boss

| 资产 | 规格 | 数量 | 说明 |
|------|------|------|------|
| **小野怪** | 16x16 | 3-5 种 | 代码搜索任务怪物 |
| **暴君 Boss** | 48x48 | 1 | 里程碑 Boss（关键算法等） |
| **主宰 Boss** | 64x64 | 1 | 终极里程碑 Boss（集成测试等） |

### 3.4 UI 元素

| 资产 | 说明 |
|------|------|
| **像素字体** | 8x8 或 16x16 中英文像素字体 |
| **血条/蓝条** | 英雄头顶状态条 |
| **对话气泡** | 像素风格气泡框（9-slice） |
| **状态图标** | 工作中、等待、阻塞、完成等状态图标 |
| **底部面板 UI** | 英雄头像框、进度条、按钮 |
| **事件横幅** | "First Blood"、"Victory" 等像素大字 |
| **小地图边框** | 侧边栏小地图的像素风框架 |
| **金币/经验值** | 飘字动画用的小图标 |

### 3.5 特效精灵

| 特效 | 帧数 | 说明 |
|------|------|------|
| 防御塔爆炸 | 8 | 塔被摧毁时的爆炸动画 |
| 水晶爆炸 | 12 | 终局水晶爆炸（全屏特效） |
| 技能特效 | 6/角色 | 每个英雄的技能释放特效 |
| Gank 速度线 | 4 | 英雄冲刺时的残影/速度线 |
| 回城特效 | 8 | 传送光圈动画 |
| 金币飘出 | 4 | 推塔后金币飞出效果 |
| 发光粒子 | 4 | Scout 的星光尾迹、泉水光效 |
| 击杀播报背景 | 1 | 横幅背景（"Legendary" 等） |

### 3.6 资产总量估算

| 类别 | 帧数 | 说明 |
|------|------|------|
| 5 个英雄 | ~360 帧 | 72 帧/英雄 |
| 地图 Tileset | ~100 块 | 静态 + 动画 tile |
| 建筑物 | ~50 帧 | 水晶、塔、泉水（含状态） |
| 野怪/Boss | ~60 帧 | 3-5 小怪 + 2 Boss |
| UI 元素 | ~40 块 | 按钮、图标、框架等 |
| 特效 | ~80 帧 | 爆炸、技能、粒子等 |
| **合计** | **~690 帧** | |

**Sprite Sheet 总尺寸**：约 2048x2048 PNG（约 200-400 KB）

---

## 四、美术外包预算估算

### 4.1 市场价格参考

| 定价方式 | 价格范围 | 来源 |
|---------|---------|------|
| 单个基础精灵 | $20 - $150 | [2D Will Never Die](https://2dwillneverdie.com/blog/how-much-do-sprites-cost/) |
| 专业像素美术师时薪 | $20 - $30/小时 | 行业标准 |
| 每帧制作时间（专业） | ~30 分钟/帧 | 约 4 帧/小时 |
| Fiverr 基础角色+动画 | $15 - $100 | [Fiverr Sprite Sheet](https://www.fiverr.com/gigs/sprite-sheet) |
| 批量折扣（5+ 精灵） | 约 70-80% 单价 | 大多数美术师提供批量优惠 |

来源：[How Much Do Sprites Cost?](https://2dwillneverdie.com/blog/how-much-do-sprites-cost/)，[Fiverr Sprite Services](https://www.fiverr.com/gigs/sprite-sheet)

### 4.2 预算方案

#### 方案 A：全 AI 生成 + 手动精修（推荐，最低成本）

| 项目 | 工具 | 成本 |
|------|------|------|
| PixelLab 订阅（3 个月） | PixelLab AI | ~$30-90 |
| Aseprite 授权 | Aseprite | $19.99 |
| 自己精修时间 | 团队内部 | 人力成本 |
| **合计** | | **~$50-110** |

适用场景：团队内有能力精修 AI 生成的素材

#### 方案 B：AI 生成 + 部分外包精修（平衡方案）

| 项目 | 方式 | 成本 |
|------|------|------|
| AI 生成初版（5 英雄 + 地图） | PixelLab + Aseprite | ~$50-110 |
| 5 英雄精修 + 完整动画外包 | Fiverr/独立美术师 | ~$500-1,500 |
| 地图 Tileset 精修外包 | Fiverr/独立美术师 | ~$200-500 |
| 特效和 UI 外包 | Fiverr/独立美术师 | ~$200-400 |
| **合计** | | **~$950-2,510** |

适用场景：追求较高美术质量但预算有限

#### 方案 C：全部专业外包（最高质量）

| 项目 | 方式 | 成本 |
|------|------|------|
| 5 英雄完整角色设计 + 动画 | 专业像素美术师 | ~$2,000-5,000 |
| MOBA 地图 Tileset 设计 | 专业像素美术师 | ~$1,000-2,000 |
| 建筑物（水晶/塔/泉水） | 专业像素美术师 | ~$500-1,000 |
| 野怪/Boss 设计 | 专业像素美术师 | ~$500-1,000 |
| UI 设计（面板/按钮/字体） | 专业像素美术师 | ~$500-1,000 |
| 特效动画 | 专业像素美术师 | ~$500-1,000 |
| **合计** | | **~$5,000-11,000** |

适用场景：追求顶级美术品质，有充足预算

### 4.3 推荐策略

**Phase 1 (MVP)：方案 A**
- 使用 PixelLab AI + 免费资源快速产出原型
- 重点：验证游戏机制和用户反馈
- 美术质量可以"够用就好"

**Phase 3 (打磨体验)：方案 B**
- 根据 Phase 1-2 的用户反馈确定最终美术方向
- AI 生成 + 外包精修，平衡质量和成本

**Phase 4 (发布)：视情况升级到方案 C**
- 如果产品验证成功且有预算，外包专业美术提升品质
- 作为差异化卖点之一

---

## 五、AI 辅助生成像素素材的可行方案

### 5.1 PixelLab 详细评估

**PixelLab 是目前最适合 King Agents 的 AI 像素素材工具。**

来源：[PixelLab 官网](https://www.pixellab.ai/)，[PixelLab API 文档](https://www.pixellab.ai/pixellab-api)，[PixelLab Review 2025](https://www.jonathanyu.xyz/2025/12/31/pixellab-review-the-best-ai-tool-for-2d-pixel-art-games/)

| 能力 | King Agents 需求 | PixelLab 支持度 | 说明 |
|------|-----------------|----------------|------|
| 角色生成 | 5 个风格各异的英雄 | 高 | 文本提示生成，可指定风格和配色 |
| 方向变体 | 4 方向或 8 方向行走 | 高 | 自动生成 4/8 方向变体是核心功能 |
| 动画生成 | idle/walk/attack/skill | 中高 | 骨骼动画 + 文本提示，但复杂动画可能需手动调整 |
| Tileset 生成 | 地图基础地砖 | 高 | 自动生成可拼接的 Tileset |
| 地图生成 | MOBA 峡谷地图 | 中 | 可生成 Top-Down 地图，但 MOBA 布局需手动调整 |
| 风格一致性 | 5 英雄统一风格 | 高 | 支持参考图，确保输出风格一致 |
| Aseprite 集成 | 精修工作流 | 高 | 官方 Aseprite 插件，功能更新频繁 |
| 特效生成 | 爆炸、光效等 | 中低 | 特效支持有限，可能需手动制作 |

### 5.2 推荐的 AI 生成工作流

#### 步骤 1：角色概念生成

```
使用 PixelLab 文本提示：
"32x32 pixel art character, purple mage with blue robe and golden staff,
 top-down RPG style, dark fantasy theme"

配合参考图：上传王者荣耀法师角色截图作为风格参考
```

#### 步骤 2：方向变体生成

```
在 PixelLab 中选择已生成的角色 → "Generate Directional Variants"
→ 自动输出 4 方向或 8 方向的 idle sprite

输出：router_idle_down.png, router_idle_up.png, ...
```

#### 步骤 3：动画帧生成

```
使用 PixelLab 骨骼动画功能：
1. 设置角色骨骼点（头、身、手、脚）
2. 定义关键帧姿势（walk cycle: 6 帧）
3. AI 自动补间生成中间帧

或使用文本提示：
"walking animation, 6 frames, pixel art character facing down"
```

#### 步骤 4：Aseprite 精修

```
将 PixelLab 输出导入 Aseprite：
1. 检查像素对齐和颜色一致性
2. 调整动画节奏（帧率/间隔）
3. 添加细节（阴影、高光、特效粒子）
4. 标记帧标签（idle, walk, attack, skill 等）
5. 导出为 Sprite Sheet (PNG + JSON)
```

#### 步骤 5：Phaser 集成

```typescript
// 加载 Aseprite 导出的 Sprite Sheet
this.load.aseprite('coder', 'assets/heroes/coder.png', 'assets/heroes/coder.json');

// 创建动画
this.anims.createFromAseprite('coder');

// 播放
this.coderSprite.play('coder_walk_down');
```

### 5.3 其他 AI 工具的辅助方案

| 阶段 | 推荐工具 | 用途 |
|------|---------|------|
| 概念探索 | Perchance (免费) | 快速生成多个角色概念，选择方向 |
| 角色原型 | PixelBox (免费) | 将概念草图转为像素精灵 |
| 正式制作 | PixelLab (付费) | 高质量角色 + 方向变体 + 动画 |
| 精修输出 | Aseprite ($19.99) | 调整细节、导出 Sprite Sheet |
| 地图制作 | PixelLab + Tiled (免费) | AI 生成 Tileset → Tiled 编排地图 |
| 特效制作 | Aseprite (手动) | 爆炸、光效等特效建议手动制作 |

### 5.4 AI 生成的局限性

| 局限 | 影响 | 应对方案 |
|------|------|---------|
| 复杂动画质量不稳定 | 技能释放、团战特效可能需要多次重试 | 核心特效动画手动制作 |
| 风格一致性波动 | 批量生成时可能出现风格偏差 | 使用参考图锁定风格，逐个检查 |
| 精灵对齐问题 | AI 生成的不同方向变体可能有轻微位移 | Aseprite 中手动校准 |
| 调色板控制 | AI 可能使用过多颜色 | 在 Aseprite 中限制调色板（推荐 16-32 色） |
| 中国风元素理解 | 王者荣耀风格的文化特征 AI 可能理解不足 | 提供详细参考图和风格描述 |

---

## 六、总结：美术资源采购路线图

| 阶段 | 时间 | 行动 | 预算 |
|------|------|------|------|
| **Phase 0 概念** | 第 1 周 | Perchance 免费生成角色概念，确定美术方向 | $0 |
| **Phase 1 MVP** | 第 2-3 周 | PixelLab AI 生成 5 英雄 + 基础地图，Aseprite 精修 | ~$50-110 |
| **Phase 2 完善** | 第 7-8 周 | 补充野怪、Boss、特效动画，完善地图细节 | ~$0-500 |
| **Phase 3 打磨** | 第 11-12 周 | 外包精修关键角色动画，UI 设计优化 | ~$500-1,500 |
| **Phase 4 发布** | 第 15 周 | 视产品表现决定是否全面升级美术品质 | ~$0-5,000 |

**总预算范围**：$50（极简 AI 方案）— $7,110（高质量混合方案）

**推荐预算**：**$1,000-2,000**（AI 生成 + 重点外包精修）
