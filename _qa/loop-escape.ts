import assert from 'node:assert/strict'
import { seventhDock as cartridge } from '../src/story/cartridges/seventhDock'
import { applyConsistencyRecovery, createChoiceRecordBlock, createInitialSave } from '../src/story/engine/reducer'
import { semanticallyRepeatsCurrentAction } from '../src/story/engine/turnConsistency'
import { normalizeSave } from '../src/story/useStoryEngine'

const base = createInitialSave(cartridge)
base.entered = true
base.choices = ['检查潮线旁的刻痕', '询问米拉反向潮标', '沿湿石寻找测绘线'].map((label, index) => ({ id: `seed-${index}`, label }))
base.blocks = [...base.blocks.filter((block) => block.id !== `choices-${base.scene}`), createChoiceRecordBlock(base.scene, base.choices)]
const first = applyConsistencyRecovery(base, cartridge, base.choices[0].label)
assert.deepEqual(first.choices.map((choice) => choice.label), base.choices.slice(1).map((choice) => choice.label))
const second = applyConsistencyRecovery(first, cartridge, first.choices[0].label)
assert.equal(second.choices.length, 1)
const soleLabel = '检查并不存在的测绘编号'
const sole = applyConsistencyRecovery({ ...base, choices: [{ id: 'sole', label: soleLabel }] }, cartridge, soleLabel)
assert.equal(sole.choices.length, 0)
assert.equal(normalizeSave(sole, cartridge).choices.length, 0)
assert.equal(semanticallyRepeatsCurrentAction('触摸潮标边缘的裂口', '检查潮标的裂口', 'zh'), true)
console.log(JSON.stringify({ ok: true, checks: ['siblings-preserved', 'strictly-shrinking', 'empty-tray-reload-safe', 'semantic-retry'] }))
