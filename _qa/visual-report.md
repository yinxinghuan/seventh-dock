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

The baseline showed a two-world Cartridge selector and `Template demo / Persistent world API` engineering controls. The independent build removes both. Runtime mode now follows the production `chat_id` or restored remote session; browser-direct access safely uses the demo adapter without exposing implementation language.

### P1 · Shared identity and save boundary — fixed

The copied template initially carried the mother UUID and `stateful-story-template` local namespace. The release has UUID `80a488ee-f6c9-4de5-a7a6-b2a9b9e88401`, local key `seventh-dock-save`, one fixed Cartridge, and no Rooftop source or world image.

### P1 · Narrow avatar overflow — fixed in inherited engine

The Shell uses `minmax(0,1fr)`, the conversation can shrink, and the player bubble reserves 41 px for its avatar. Automated bounding-box and document-width assertions pass at 320 px.

## Foundation audit

- Functional emoji icons: none; custom linear SVG family only.
- Primary actions and all controls meet 44 px targets.
- Horizontal choices use `onClick`; drag-to-scroll does not submit on pointer down.
- Entry, core play, player avatar, check/state feedback, World drawer, platform layout and external guest states are captured.
- Debug HTTPS avatar reaches action, protagonist record and gen-image `ref_url`; fallback stays local and is not sent to img2img.
- Formal poster remains English-only and was previously validated at 1024 and 160.

## Final recommendation

Average 4.7/5. Ready for production Aigram testing of real `head_url`, cloud save restoration and stateful chat continuation.
