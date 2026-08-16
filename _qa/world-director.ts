import assert from 'node:assert/strict'
import { listCartridges } from '../src/story/cartridges'

for (const locale of ['zh', 'en'] as const) {
  const cartridge = listCartridges(locale)[0]
  const events = cartridge.presetEventDirector?.events ?? []
  assert.ok(events.length >= 6, `${locale}: expected at least six world-native events`)
  const nodeIds = new Set(cartridge.initialMap.map((node) => node.id))
  const ids = new Set<string>()
  for (const event of events) {
    assert.ok(!ids.has(event.id), `${locale}: duplicate event id ${event.id}`)
    ids.add(event.id)
    assert.ok(nodeIds.has(event.locationId), `${locale}: unknown event location ${event.locationId}`)
    assert.ok(event.choiceLabel.trim().length > 0, `${locale}: missing event action`)
    assert.ok(event.objective.trim().length > 0, `${locale}: missing event objective`)
    assert.ok(event.choices.length >= 1 && event.choices.length <= 5, `${locale}: event choices must be one to five`)
  }
  const firstPerson = events.filter((event) => /FIRST-PERSON PLAYER-EYE VIEW/i.test(event.imagePrompt)).length
  assert.equal(firstPerson * 2, events.length, `${locale}: authored event images must be evenly split between first and third person`)
  assert.equal(cartridge.imageDirector?.perspective?.ordinary, 'balanced')
  assert.equal(cartridge.imageDirector?.perspective?.importantDialogue, 'first-person')
  assert.equal(cartridge.imageDirector?.perspective?.newLocation, 'observer')
  assert.ok(cartridge.imageDirector?.guaranteedTriggers.includes('character-expression'))
}

console.log(JSON.stringify({ ok: true, checks: ['event-count', 'location-grounding', 'one-to-five-choices', 'balanced-authored-images', 'dialogue-and-location-overrides'] }))

