import { latestReadingAnchorId } from '../src/story/engine/readingAnchor'
import type { StoryBlock } from '../src/story/types'

function equal(actual: unknown, expected: unknown, message: string) { if (actual !== expected) throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`) }

const blocks: StoryBlock[] = [
  { id: 'opening', kind: 'narration', text: 'The journey begins.' },
  { id: 'action-4', kind: 'event', text: 'Ask about the route.' },
  { id: 'answer-4', kind: 'narration', text: 'The guide points to the east road.' },
  { id: 'image-4', kind: 'image', text: '' },
]

equal(latestReadingAnchorId(blocks), 'action-4', 'resume starts with the last action and leaves its consequence visible')
equal(latestReadingAnchorId(blocks.slice(0, 1)), 'opening', 'opening is the pre-action fallback')
equal(latestReadingAnchorId([{ id: 'image-only', kind: 'image', text: '' }]), undefined, 'image-only history has no invented anchor')

console.log(JSON.stringify({ ok: true, checks: ['latest-action-context', 'opening-fallback', 'no-invented-anchor'] }))
