import assert from 'node:assert/strict'
import { seventhDock } from '../src/story/cartridges/seventhDock'
import { createAuthorityShadowSample } from '../src/story/engine/authorityShadow'
import { createInitialSave } from '../src/story/engine/reducer'
const save = createInitialSave(seventhDock); const visible = JSON.stringify(save.choices); const sample = createAuthorityShadowSample(save, seventhDock)
assert.equal(JSON.stringify(save.choices), visible); assert.equal(sample.choices.length, save.choices.length); assert.equal(sample.emptyTray, false); assert.ok(sample.choices.every((choice) => ['accepted', 'rejected', 'open'].includes(choice.status))); assert.equal(createAuthorityShadowSample({ ...save, entered: true, choices: [], sessionEnded: false }, seventhDock).emptyTray, true)
console.log('seventh-dock authority shadow is observational: ok')
