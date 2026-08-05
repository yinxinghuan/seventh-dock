# 《Seventh Dock》技术文档

## 1. 技术栈

- React 18 + TypeScript + Less + Vite 5，普通响应式 DOM 时间线，无固定比例 Canvas。
- `base: './'`，所有构建资源可部署到任意子路径；`index.html` 加载远程 `guest-shell.js`。
- Aigram runtime：`callAigramAPI()` 读取玩家资料，`useGenImage()` 运行时生图，`useGameSave()` 负责 UUID 范围的云端/本地存档。
- 正式入口默认通过 Aigram `game-chat` Adapter 持续生成；带有效 chatId 时使用实验 stateful Adapter，`story_mode=demo` 才使用有限确定性 Mock。
- 轻量自定义 zh/en i18n，不引入第三方国际化库。

## 2. 目录结构

- `src/game-id.ts`：由 `games.json` 同步的永久 UUID `80a488ee-f6c9-4de5-a7a6-b2a9b9e88401`。
- `src/story/StoryShell.tsx`：单游戏入口、状态头、时间线、输入区和 World 抽屉。
- `src/story/cartridges/seventhDock.ts`：Seventh Dock 的 zh/en 内容、数值、角色、地图、物品和演示回合。
- `src/story/cartridges/index.ts`：固定 `DEFAULT_CARTRIDGE_ID='seventh-dock'`；不提供世界选择器。
- `src/story/engine/`：协议解析、结构化命令和 reducer。
- `src/story/adapters/`：Aigram AI、有限本地演示与实验远程连续世界适配器。
- `src/story/useStoryEngine.ts`：状态镜像、Aigram 存档、Adapter 调用和串行图片队列。
- `src/story/usePlayerProfile.ts`：调试覆盖、Aigram 用户资料与默认 `U` 回退。
- `src/story/audio/StorySynth.ts`、`useStoryAudio.ts`：程序化海港声景、事件反馈、数值张力映射与静音记忆。
- `src/shared/runtime/`、`src/shared/save/`：平台 bridge、生图与存档实现。
- `src/story/img/worlds/seventh-dock-entry.webp`：原生 16:9、无画框的首页港区横图；`seventh-dock.webp` 方形母图只用于图片等待态。
- `public/poster.png`、`doc/poster-source.md`：正式英文海报及 transit 来源记录。

## 3. 核心模块

`StoryShell` 只解析语言、`story_mode`、`chat_id` 和玩家身份，不接受 Cartridge 切换。无 chatId 且未显式 demo 时默认 `aigram`。页面按 `entry → conversation + composer + optional drawer` 组织，Shell 明确使用 `minmax(0,1fr)` 网格列，避免 320 px 下长行动把右侧头像推出屏幕。

`useStoryEngine()` 调用 `useGameSave('seventh-dock')`。本地命名空间与游戏 UUID 双重隔离；`archiveRef` 是写后立即更新的本地镜像，避免 `savedData` 只在挂载时读取造成后续写入覆盖。StorySave v4 保存地点、时间、目标、数值、剧情块、地图、物品、关系、语言和远程 chatId。

协议解析器只接受 choices/widget/skill_check/state/map_update/inventory/reputation/party_change/session_end 白名单命令，并兼容弯引号/全角 choice 分隔符、正文末尾带提示的编号/项目符号行动，以及 AI 偶发缺少角色左方括号的台词格式。恢复的自然语言行动从正文去重并写入真实按钮；没有可信选择时保持空数组，不再由 Reducer 补通用继续。若 `session_end` 与具体行动同时出现，Composer 保留具体行动并提交准确按钮文字；只有没有行动的真正章节节点显示单一继续。数值按 Cartridge 的 min/max 夹紧；未知命令不进入 UI 或存档。Aigram Adapter 每轮携带权威状态与最近 20 个非图片剧情块；远程 Adapter 过滤 thinking，并在每轮追加精确三选项格式合同。两者都只在完整回合确认后提交。

旧 Mock 固定兜底句会在载入时连同前一条无效行动一起移除，scene 计数回退并恢复“继续”选项。若旧存档当前为空或只剩通用继续，`recoverPersistedChoices()` 会从最近一轮正文恢复可信编号/项目符号行动、去掉重复列表并重新持久化，已有用户无需清档。AI/远程失败只保留瞬时失败行动，显示可重试错误，不修改存档。

`usePlayerProfile()` 通过 `/note/telegram/user/get/info/by/telegram_id` 读取 `data.name` 与 `head_url`。只有 HTTPS 头像进入 `ref_url`；图片队列在资料请求结束后串行执行，并追加“参考人物是玩家主角、环境与事件仍是主体”的约束。头像与用户名不进入 StorySave。

场景出图采用 AI 提议优先、本地 `imageDirector` 兜底。Aigram 与 remote Adapter 都会提取 `[image_prompt]`；缺失时，`engine/imageDirector.ts` 按首次抵达、稀有物品、队伍变化和章节节点强制补图，关系/目标/检定变化使用 2 回合冷却，连续 4 个有效回合无图时按可见结果兜底。`MapNode.visited` 区分首次抵达与回访；每轮最多追加一个带 `source/reason` 的内联图片块，仍进入原有严格串行 worker。

语言优先级为 query `lang`、存档和浏览器系统；明确中文/英文自由输入会切换后续 Shell、Cartridge 内容与远程回复约束，历史块保持原文。

文字大小由顶部 `TextSizeControl` 提供 `small / standard / large` 三档，写入 `localStorage.alteru_story_text_size`，通过 `.st-shell[data-text-size]` 的 CSS 变量只调整阅读层级。它不进入 StorySave，也不触发云端剧情存档写入。

声音使用浏览器 Web Audio API 实时合成，不下载音频文件，也不请求音频生成接口。首次用户手势后创建 `AudioContext`，`music / ambient / sfx` 三路总线限制最多 8 个活跃声部。港区配置为 54 BPM、A2 根音和五声音阶；潮位、警戒升高及补给降低会提高 8 拍循环的脉冲密度。进入、行动、检定成败、状态变化、发现、图片完成、阶段小结与错误均有独立 cue。顶部 44 px 扬声器按钮把偏好写入 `localStorage.alteru_story_audio_muted`；页面后台暂停，设备不支持时静默降级。音频偏好不进入 StorySave。

## 4. 扩展点

- 改港区故事、数值、角色、地图、物品和演示回合：编辑 `src/story/cartridges/seventhDock.ts`。
- 改结构化规则或新增命令：先更新 `src/story/types.ts`，再改 `engine/protocol.ts` 与 `engine/reducer.ts`。
- 改正式 AI 上下文/提示：编辑 `src/story/adapters/aigram.ts`；改远程世界接口：编辑 `remote.ts`。保持 `StoryAdapter` 合同。
- 改出图密度或保证事件：编辑 `seventhDock.ts` 的 `imageDirector`；换港城场景画风改 `sceneImageDirection`。通用算法位于 `engine/imageDirector.ts`。
- 改主角资料或图片身份约束：分别编辑 `usePlayerProfile.ts` 与 `useStoryEngine.ts`；不要把头像字段加入 StorySave。
- 改界面结构与视觉：编辑 `StoryShell.tsx`、`story.less` 和 `doc/visual.md`；保留文字优先滚动锚点、时间线图片原位、44 px 触控目标、三档可读字号和 148–310 px 自适应快速回复合同。
- 改音色、节奏或数值张力：先改 `seventhDock.ts` 的 `audioTheme`；只有新增跨题材事件音色时才改 `audio/StorySynth.ts`。

`StoryShell` 为每个 block 标记稳定 id。首次进入将时间线置顶；提交时将 pending 行移到阅读起点；完整回复入列后定位本轮首个非图片、非玩家行动 block；接口错误也拥有自己的阅读锚点。已开始回合保留最多 60dvh/520 px 的阅读余量，保证短回复/错误能滚到视野上部。图片状态不触发滚动。快速回复根据中英文视觉字符数计算目标宽度，CSS 再以 `82vw` 和 390 px 封顶。
- 改海报/母图：更新对应资源及 `doc/poster-source.md`，正式海报仍必须 transit 生成且英文-only。
- 新建另一款游戏：从母版生成独立 repo/UUID/save key/poster，而不是在本项目重新加入 Cartridge 选择器。
- 世界实体字段位于 `types.ts`，协议由 `protocol.ts` 解析、`reducer.ts` 原子写入；切到行囊时，`useStoryEngine.prepareInventoryImages()` 自动把缺图、失败或旧 `imageStyleVersion` 的物品加入与剧情图共用的串行 worker。物品提示始终合并 `itemImageDirection`，线上以本作 `coverImage` 的公网 HTTPS URL 作为风格 `ref_url`；状态、URL 与画风版本保存在 `InventoryItem`。旧画风 URL 在重绘时保留但不展示，新图成功后再原子替换。题材内容和首次显影文案统一在 `seventhDock.ts` 配置。
- 恢复旧存档时按稳定 id 补齐 Cartridge 新增的说明字段，同时保留旧数量、地点状态和已生成图片；无需删档重开。
