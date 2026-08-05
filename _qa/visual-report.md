# Seventh Dock Visual QA

## Context

- Build: 0.1.0 independent release
- Viewports: 390×844 and 320×568
- Primary evidence: `_qa/ui/seventh-dock-*-final-platform-layout-*.png`
- External release evidence: `_qa/ui/seventh-dock-entry-final-external-guest-390x844.png`
- Baseline: `_qa/ui/seventh-dock-entry-pass1-platform-layout-390x844.png`

## Decision

Pass. Seventh Dock is now a single game rather than a selectable world inside a template. No P0/P1 remains.

| Category | Score |
|---|---:|
| Hierarchy | 5 |
| Coherence | 5 |
| Readability | 4 |
| Game feel | 4 |
| Asset quality | 5 |
| Responsive UX | 5 |
| Polish | 5 |

## Findings and fixes

### P1 · Product entry exposed template internals — fixed

The baseline showed a two-world Cartridge selector and engineering controls. The independent build removes both. Browser-direct and AlterU production entries now default to Aigram AI; a valid/restored `chat_id` selects the experimental remote session, while `story_mode=demo` is explicit finite QA only.

### P1 · Shared identity and save boundary — fixed

The copied template initially carried the mother UUID and `stateful-story-template` local namespace. The release has UUID `80a488ee-f6c9-4de5-a7a6-b2a9b9e88401`, local key `seventh-dock-save`, one fixed Cartridge, and no Rooftop source or world image.

### P1 · Narrow avatar overflow — fixed in inherited engine

The Shell uses `minmax(0,1fr)`, the conversation can shrink, and the player bubble reserves 41 px for its avatar. Automated bounding-box and document-width assertions pass at 320 px.

## Foundation audit

- Functional emoji icons: none; custom linear SVG family only.
- Primary actions and all controls meet 44 px targets.
- Horizontal choices use `onClick`; drag-to-scroll does not submit on pointer down.
- Opening and generated-turn captures at 390×844 and 320×568 confirm text-first reading anchors; image placeholder/ready transitions do not move the feed. Choice widths differ by label length and stay within 82vw.
- Aigram default-mode QA forces one HTTP 503, proves scene/state remain unchanged, anchors the visible 44 px retry control, retries the same action with `WORLD_STATE_JSON`, and commits a genuinely new response. Both 390×844 and 320×568 pass.
- Entry, core play, player avatar, check/state feedback, World drawer, platform layout and external guest states are captured.
- Debug HTTPS avatar reaches action, protagonist record and gen-image `ref_url`; fallback stays local and is not sent to img2img.
- Text size: top `Aa` menu, 44 px target, small/standard/large states, 19 px large prose, reload persistence, title/control non-overlap and 320 px overflow assertions pass.
- Formal poster remains English-only and was previously validated at 1024 and 160.

## Final recommendation

Average 4.7/5. Default Aigram continuation and real `head_url` are verified; cross-device cloud restoration and experimental remote chatId creation remain production follow-ups.

## 2026-08-06 音频发布复验

- P1 已修复：挂载阶段不再提前创建 AudioContext；首次真实手势启动 1 个上下文、6 个振荡器与 2 个 buffer source。
- 静音恢复路径通过：静音进入不创建上下文，点击“开启声音”一次即可启动，`aria-pressed` 与实际运行状态一致。
- `seventh-dock-audio-unlock-platform-layout-390x844.png`、`320x568.png` 与 `external-guest-390x844.png` 通过；无新增遮挡或横向溢出。评分保持平均 4.7/5，无 P0/P1。
