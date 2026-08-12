import assert from 'node:assert/strict'
import { seventhDock } from '../src/story/cartridges/seventhDock'
import { resolveDomainAction } from '../src/story/engine/domainRules'
import { applyParsedScene, createInitialSave } from '../src/story/engine/reducer'
import { parseStoryProtocol } from '../src/story/engine/protocol'

const initial = createInitialSave(seventhDock)
assert.deepEqual(initial.characters.map((character) => character.id), ['mira'])
const expected = ['traces', 'mira', 'route']
for (const [index, choice] of seventhDock.opening.choices.entries()) {
  const save = createInitialSave(seventhDock)
  const resolution = resolveDomainAction(save, seventhDock, choice.label)
  assert.equal(resolution?.kind, 'accepted')
  const next = applyParsedScene(save, parseStoryProtocol('[widget: tide, value: 100]\n[character_update: character_id="oren" character="奥伦"]', 'zh'), seventhDock, choice.label, undefined, undefined, undefined, resolution)
  assert.equal(next.facts['opening-method'], expected[index])
  assert.equal(next.characters.some((character) => character.id === 'oren'), false)
  assert.equal(resolveDomainAction(next, seventhDock, choice.label)?.kind, 'rejected')
}
console.log(JSON.stringify({ ok: true, branches: 3, hiddenRoster: ['oren', 'sai'] }))

