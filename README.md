# GalGame Web Runtime

纯静态 Web 视觉小说播放器。Runtime 不负责内容生成，只加载 `game_data.json`，在浏览器内解释剧情命令、渲染画面并维护本地存档。

> 当前状态：功能开发中。2026-08-23 已完成资源预载、响应式布局、声音事件和玩家流程图整改；生产构建与 lint 均通过。

## 技术栈

- React 19.2
- TypeScript 6
- Vite 8
- Zustand 5
- Tailwind CSS 4.2
- ESLint 9

## 架构

```text
URL ?data=<game_data.json>
  → App.loadGameData
  → Zustand GameState
  → command interpreter
  ├── BackgroundLayer
  ├── DialogBox / ChoiceMenu
  ├── AudioManager
  ├── ChapterTitle
  └── Save/Load/Settings/Backlog/Endings/Progress
```

核心文件：

| 文件 | 责任 |
| --- | --- |
| `src/types.ts` | GameData、18 类 Command 和运行时状态类型 |
| `src/store.ts` | 数据加载、命令解释器、导航、存档和设置 |
| `src/engine.ts` | 条件表达式和变量修改 |
| `src/preloader.ts` | 首章关键资源、下一分支和全局后台预加载 |
| `src/uiConfig.ts` | UI 默认值和配置合并 |
| `src/App.tsx` | 数据 URL、基础画面/模态路由和键盘控制 |
| `src/components/*` | 播放画面和覆盖面板 |

## 当前功能

- 对话、旁白、打字机和自动播放
- 角色表情、七档横向位置、多角色同屏和说话者高亮
- 背景、全屏/半屏 CG
- 连续 BGM、可重播角色语音和不会被批处理丢失的 SE 事件队列
- 条件选项、变量、条件命令队列、跳转和结局
- 20 个 localStorage 存档位及缩略图
- 对话与语音回看、设置、结局和只读剧情路线图
- 章节标题、震动、闪屏、雨、雪和樱花效果
- `config.ui` 自定义标题页、按钮、对话框、名牌和面板
- 启动首章图片/音频预载、真实分支的渐进预载与失败提示
- 动态视口、安全区、手机竖屏和小尺寸横屏布局
- 流程图自动适应、拖拽、滚轮/双指缩放和章节详情

## 本地运行

```bash
npm install
npm run dev
```

默认 Vite 地址通常为 <http://localhost:5173>。不传参数时加载 `public/game_data.json`；也可以指定：

```text
http://localhost:5173/?data=https://example.com/game_data.json
```

## 构建与检查

```bash
npm run lint
npm run build
```

当前检查结果：

- `npm run build`：通过。生产产物默认使用 `./` 相对基址，可放入 ZIP 或任意子目录。
- `npm run lint`：通过。
- 无头 Chromium：通过 1440×900 与 390×844 的完整交互回归。

## GameData 边界

Runtime 读取的核心结构：

```ts
interface GameData {
  meta: GameMeta;
  config: GameConfig;
  characters: Record<string, CharacterDef>;
  scenes: Record<string, SceneDef>;
  variables: Record<string, string | number | boolean>;
  endings: Record<string, EndingDef>;
  chapters?: ChapterDef[];
  side_chapters?: SideChapterDef[];
  _asset_manifest?: Record<string, string>;
  start_scene?: string;
  scene_order?: string[];
}
```

Generator 提供 `chapters` 和 `side_chapters` 给进度图使用，TypeScript 接口已同步。
两端仍没有共享 JSON Schema，后续字段变化仍需通过自动契约测试防止再次漂移。

### Command 类型

| type | 主要字段 | 行为 |
| --- | --- | --- |
| `bg` | `src`, `transition?` | 切换背景 |
| `show` | `character`, `expression?`, `position?` | 显示/更新角色 |
| `hide` | `character` | 隐藏角色 |
| `dialog` | `character`, `text`, `expression?`, `voice?` | 角色对话 |
| `narration` | `text`, `voice?` | 旁白 |
| `choice` | `options[]` | 条件选项、变量修改和跳转 |
| `jump` | `target` | 场景跳转 |
| `bgm` | `src`, `fadeIn?`, `fadeOut?`, `loop?` | BGM |
| `se` | `src` | 音效 |
| `set` | `variable/value` 或 `character/expression` | 变量或表情修改 |
| `if` | `condition`, `then`, `else?` | 条件命令 |
| `wait` | `duration` | 延时 |
| `shake` | `intensity?`, `duration?` | 画面震动 |
| `flash` | `color?`, `duration?` | 闪屏 |
| `effect` | `name?`, `enable` | 粒子效果 |
| `cg` | `src`, `mode?` | 全屏/半屏 CG |
| `chapter_title` | `text`, `subtitle?` | 章节标题 |
| `end` | `ending_id?` | 结束并记录结局 |

## 资源路径

运行时按以下顺序解析图片：

1. 已是 `http`、`data` 或 `blob` URL：直接使用。
2. `_asset_manifest[path]` 存在：使用清单映射。
3. 否则保留原始相对路径。

`?data=` 加载跨域 JSON 和资源时，来源服务器必须允许浏览器 CORS。

## 状态与存档

- 游戏状态集中在 Zustand store。
- 存档、设置和已达成结局保存在 localStorage。
- 每个存档记录 scene、command index、条件分支队列、已访问场景、variables、可见角色、背景和 BGM。
- 条件表达式支持比较运算以及 `and/or/not`。

## 与 Generator 的关系

```text
gal_generator
  → package / publish
  → game_data.json + asset manifest
  → gal_web_runtime
```

当前两端没有共享 JSON Schema：Generator 用 Python dict 构造数据，Runtime 手写 TypeScript 类型。已修复当前已知字段漂移，但仍需 schema 生成和 fixture 校验。契约审计见 Generator 仓库的 `docs/model-interface-decoupling-audit.md` 和 `docs/current-architecture.md`。

## 部署

仓库包含 GitHub Pages workflow。推送 `main` 后由 Actions 构建并部署静态产物。Generator 的离线导出与 GitHub 发布会校验资源下载和清单完整性，不再发布静默缺图/缺音频的包。

完整审计清单见 [`docs/runtime-audit-2026-08.md`](docs/runtime-audit-2026-08.md)。

## License

MIT。详见 [LICENSE](LICENSE)。
