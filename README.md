# GalGame Web Runtime

纯静态 Web 视觉小说（GalGame）运行时引擎。加载结构化 JSON 数据即可在浏览器中运行完整的视觉小说体验，零后端依赖。

## 在线体验

**https://mumuzi2023.github.io/gal_web_runtime/**

## 功能

| 模块 | 说明 |
|------|------|
| **对话系统** | 打字机效果、可调速度、角色名称彩色标牌、旁白模式 |
| **角色立绘** | 多角色同屏（左/中/右）、表情差分切换、说话角色高亮 |
| **背景系统** | 背景图切换、过渡效果（fade/dissolve）、CG 全屏模式 |
| **音频系统** | BGM 循环+淡入淡出切换、角色语音自动播放、独立音量控制 |
| **选项分支** | 多选项菜单、条件分支、变量/好感度系统 |
| **存档系统** | 20 个存档槽位、localStorage 持久化、场景快照 |
| **特效系统** | 樱花/雨/雪粒子效果、画面震动、闪白 |
| **系统菜单** | 文字速度、自动播放速度、BGM/语音/音效音量滑块 |
| **结局系统** | 多结局条件判定、达成记录、结局列表（★/☆） |
| **对话回看** | 完整对话记录浏览、角色名称着色 |

## 技术栈

- **Vite** + **React 19** + **TypeScript**
- **Zustand** — 状态管理 + 存档序列化
- **Tailwind CSS v4** — 样式
- 产物：纯静态 HTML/CSS/JS（~70KB gzip），可部署到任意静态托管

## 项目结构

```
src/
├── App.tsx                    # 主入口，screen 路由，数据加载
├── main.tsx                   # React 挂载
├── types.ts                   # 游戏数据类型定义（GameData / Command / ...）
├── store.ts                   # Zustand store — 命令解释器、存档、设置
├── engine.ts                  # 条件表达式求值器、变量操作
├── index.css                  # Tailwind + 动画（打字机、震动、粒子）
└── components/
    ├── BackgroundLayer.tsx     # 背景图 + 角色立绘 + 粒子特效
    ├── DialogBox.tsx           # 对话框 + 打字机效果 + 控制按钮
    ├── ChoiceMenu.tsx          # 分支选项菜单
    ├── ChapterTitle.tsx        # 章节标题叠加层
    ├── AudioManager.tsx        # BGM / 语音音频管理（无可视 UI）
    ├── TitleScreen.tsx         # 标题页 + 菜单
    ├── SettingsPanel.tsx       # 设置面板（6 项滑块）
    ├── SaveLoadScreen.tsx      # 存档 / 读档界面
    ├── BacklogPanel.tsx        # 对话历史回看
    └── EndingsScreen.tsx       # 结局列表
public/
└── game_data.json             # 示例游戏数据（樱花学园）
```

## 使用方式

### 本地开发

```bash
npm install
npm run dev
# 打开 http://localhost:5173/?data=/game_data.json
```

### 构建部署

```bash
npm run build
# 产物在 dist/，复制 game_data.json 到 dist/ 后部署到任意静态服务器
```

### 加载自定义游戏数据

在 URL 中传递 `?data=<URL>` 参数指向任意 `game_data.json`：

```
https://mumuzi2023.github.io/gal_web_runtime/?data=https://example.com/my_game.json
```

不传参时自动加载 `public/game_data.json`。

## 与 Generator 的关系

本仓库是**纯播放端**，不包含任何内容生成逻辑。

```
┌─────────────────────┐          game_data.json          ┌─────────────────────┐
│   gal_generator     │  ──────────────────────────────▶  │  gal_web_runtime    │
│   (生成器后端)       │     唯一接口：JSON 文件           │  (Web 播放引擎)      │
│                     │                                   │                     │
│ • 剧本分析/生成      │                                   │ • 解析 JSON 驱动游戏 │
│ • 角色/背景图片生成  │                                   │ • 对话/选项/分支渲染  │
│ • 语音合成          │                                   │ • 存档/设置/结局管理  │
│ • 资源上传到 R2 CDN │                                   │ • 纯静态，零后端依赖  │
└─────────────────────┘                                   └─────────────────────┘
```

**接口规范**：Generator 输出的 `game_data.json` 须符合 [`src/types.ts`](src/types.ts) 中 `GameData` 接口定义。

## game_data.json 接口规范

```typescript
interface GameData {
  meta: {
    title: string;          // 游戏标题
    author: string;         // 作者
    version: string;        // 版本号
    description: string;    // 简介
  };
  config: {
    ui: {
      textbox?: { style?: string; opacity?: number };
      nameplate?: { style?: string; position?: string };
    };
  };
  characters: Record<string, {
    name: string;           // 显示名称（如 "宫本樱"）
    color: string;          // 名牌颜色（如 "#FFB6C1"）
    expressions: Record<string, string>;  // 表情 → 图片 URL
    voice_prefix?: string;
  }>;
  scenes: Record<string, {
    background?: string;    // 背景图 URL
    bgm?: string;           // BGM URL
    commands: Command[];    // 指令序列
  }>;
  variables: Record<string, string | number | boolean>;
  endings: Record<string, {
    name: string;           // 结局名称
    condition: string;      // 判定条件表达式
  }>;
  start_scene?: string;     // 起始场景 key
  scene_order?: string[];   // 场景播放顺序
  _asset_manifest?: Record<string, string>;  // 相对路径 → 绝对 URL 映射
}
```

### 支持的 Command 类型

| type | 说明 | 关键字段 |
|------|------|----------|
| `bg` | 切换背景 | `src`, `transition` |
| `show` | 显示角色 | `character`, `expression`, `position` |
| `hide` | 隐藏角色 | `character` |
| `dialog` | 角色对话 | `character`, `expression`, `text`, `voice` |
| `narration` | 旁白 | `text`, `voice` |
| `choice` | 选项分支 | `options[]{text, jump?, set?, condition?}` |
| `jump` | 跳转场景 | `target` |
| `bgm` | 播放 BGM | `src`, `fadeIn` |
| `se` | 播放音效 | `src` |
| `set` | 设置变量 | `variable`, `value`（`"+2"` 为增量） |
| `if` | 条件判断 | `condition`, `then`, `else` |
| `wait` | 等待 | `duration`（毫秒） |
| `shake` | 画面震动 | `duration` |
| `flash` | 闪屏 | `color`, `duration` |
| `effect` | 粒子特效 | `name`（sakura/rain/snow）, `enable` |
| `cg` | 全屏 CG | `src` |
| `chapter_title` | 章节标题 | `text`, `subtitle` |
| `end` | 结局 | `ending_id` |

## 开发路线图

### ✅ v1.1 新功能（已完成）

| # | 功能 | 说明 | 状态 |
|---|------|------|------|
| 1 | **图片预加载与缓存** | 游戏启动时预加载所有背景和角色立绘，使用浏览器缓存策略避免重复请求，切换场景时零延迟 | ✅ 已完成 |
| 2 | **全中文标识** | 所有 UI 按钮、提示文字、存档槽位等标识统一使用中文（如"自动"、"记录"、"存档"、"菜单"等） | ✅ 已完成 |
| 3 | **亮色调浮窗面板** | 设置面板、结局列表、存档/读档界面改为亮色调风格，半透明白色背景 + 柔和边框；面板周围显示当前场景背景图作为衬底 | ✅ 已完成 |
| 4 | **对话记录角色头像** | 在回看记录（LOG）中显示说话角色的头像缩略图；不同角色之间或插入旁白时用淡色长横线分隔 | ✅ 已完成 |
| 5 | **存档缩略图** | 存档槽位显示对应存档时刻的场景缩略图（背景 + 角色立绘的小窗口渲染） | ✅ 已完成 |
| 6 | **进度流程图** | 新增"进度"面板（与存档、记录并列），以可拖拽流程图展示章节分支；每个节点代表一个章节或选项；点击节点可跳转；仅解锁已存档和当前进度之前的节点 | ✅ 已完成 |

### ✅ v1.0 基础功能

- 对话系统（打字机效果、角色名称彩色标牌、旁白模式）
- 角色立绘（多角色同屏、表情差分、说话角色高亮）
- 背景系统（切换、过渡效果、CG 全屏模式）
- 音频系统（BGM 循环+淡入淡出、角色语音、音量控制）
- 选项分支（多选项菜单、条件分支、变量/好感度系统）
- 存档系统（20 个槽位、localStorage 持久化）
- 特效系统（樱花/雨/雪粒子、画面震动、闪白）
- 系统菜单（文字速度、自动播放速度、音量滑块）
- 结局系统（多结局条件判定、达成记录）
- 对话回看（完整历史浏览）

## License

MIT

## 版本

当前版本：**v0.0.1** — 核心播放引擎功能完整，可独立运行。
