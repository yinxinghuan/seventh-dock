# 《Seventh Dock》技术文档

## 1. 技术栈

- React 18 + TypeScript + Less + Vite 5，普通响应式 DOM 时间线，无固定比例 Canvas。
- `base: './'`，所有构建资源可部署到任意子路径；`index.html` 加载远程 `guest-shell.js`。
- Aigram runtime：`callAigramAPI()` 读取玩家资料，`useGenImage()` 运行时生图，`useGameSave()` 负责 UUID 范围的云端/本地存档。
- 远程连续剧情通过 stateful story Adapter；没有 chatId 时使用确定性 mock Adapter。
- 轻量自定义 zh/en i18n，不引入第三方国际化库。

## 2. 目录结构

- `src/game-id.ts`：由 `games.json` 同步的永久 UUID `80a488ee-f6c9-4de5-a7a6-b2a9b9e88401`。
- `src/story/StoryShell.tsx`：单游戏入口、状态头、时间线、输入区和 World 抽屉。
- `src/story/cartridges/seventhDock.ts`：Seventh Dock 的 zh/en 内容、数值、角色、地图、物品和演示回合。
- `src/story/cartridges/index.ts`：固定 `DEFAULT_CARTRIDGE_ID='seventh-dock'`；不提供世界选择器。
- `src/story/engine/`：协议解析、结构化命令和 reducer。
- `src/story/adapters/`：本地演示与远程连续世界适配器。
- `src/story/useStoryEngine.ts`：状态镜像、Aigram 存档、Adapter 调用和串行图片队列。
- `src/story/usePlayerProfile.ts`：调试覆盖、Aigram 用户资料与默认 `U` 回退。
- `src/shared/runtime/`、`src/shared/save/`：平台 bridge、生图与存档实现。
- `src/story/img/worlds/seventh-dock.webp`：入口和图片等待态共用的无字港区母图。
- `public/poster.png`、`doc/poster-source.md`：正式英文海报及 transit 来源记录。

## 3. 核心模块

`StoryShell` 只解析语言、`chat_id` 和玩家身份，不接受 Cartridge 切换。页面按 `entry → conversation + composer + optional drawer` 组织，Shell 明确使用 `minmax(0,1fr)` 网格列，避免 320 px 下长行动把右侧头像推出屏幕。

`useStoryEngine()` 调用 `useGameSave('seventh-dock')`。本地命名空间与游戏 UUID 双重隔离；`archiveRef` 是写后立即更新的本地镜像，避免 `savedData` 只在挂载时读取造成后续写入覆盖。StorySave v4 保存地点、时间、目标、数值、剧情块、地图、物品、关系、语言和远程 chatId。

协议解析器只接受 choices/widget/skill_check/state/map_update/inventory/reputation/party_change/session_end 白名单命令。数值按 Cartridge 的 min/max 夹紧；未知命令不进入 UI 或存档。远程 Adapter 过滤 thinking，只在完整回合确认后提交状态。

`usePlayerProfile()` 通过 `/note/telegram/user/get/info/by/telegram_id` 读取 `data.name` 与 `head_url`。只有 HTTPS 头像进入 `ref_url`；图片队列在资料请求结束后串行执行，并追加“参考人物是玩家主角、环境与事件仍是主体”的约束。头像与用户名不进入 StorySave。

语言优先级为 query `lang`、存档和浏览器系统；明确中文/英文自由输入会切换后续 Shell、Cartridge 内容与远程回复约束，历史块保持原文。

## 4. 扩展点

- 改港区故事、数值、角色、地图、物品和演示回合：编辑 `src/story/cartridges/seventhDock.ts`。
- 改结构化规则或新增命令：先更新 `src/story/types.ts`，再改 `engine/protocol.ts` 与 `engine/reducer.ts`。
- 改远程世界接口：编辑 `src/story/adapters/remote.ts`，保持 `StoryAdapter` 合同。
- 改主角资料或图片身份约束：分别编辑 `usePlayerProfile.ts` 与 `useStoryEngine.ts`；不要把头像字段加入 StorySave。
- 改界面结构与视觉：编辑 `StoryShell.tsx`、`story.less` 和 `doc/visual.md`；保留时间线图片原位、44 px 触控目标和窄屏网格收缩合同。
- 改海报/母图：更新对应资源及 `doc/poster-source.md`，正式海报仍必须 transit 生成且英文-only。
- 新建另一款游戏：从母版生成独立 repo/UUID/save key/poster，而不是在本项目重新加入 Cartridge 选择器。
