import assert from 'node:assert/strict'
import { seventhDock } from '../src/story/cartridges/seventhDock'
import { executeStoryTurn } from '../src/story/engine/executeTurn'
import { createInitialSave } from '../src/story/engine/reducer'

const initial = createInitialSave(seventhDock)
const initialJson = JSON.stringify(initial)
let domainModelCalls = 0
const domain = await executeStoryTurn({
  save: initial,
  cartridge: seventhDock,
  action: '检查外堤上的测量痕迹',
  generator: { async send(): Promise<never> { domainModelCalls += 1; throw new Error('MODEL_MUST_NOT_RUN') } },
})
assert.equal(domain.source, 'domain')
assert.equal(domainModelCalls, 0)
assert.equal(domain.save.scene, initial.scene + 1)
assert.equal(domain.save.facts['opening-method'], 'traces')
assert.equal(domain.save.stats.tide, initial.stats.tide + 8)
assert.equal(domain.save.stats.supplies, initial.stats.supplies - 1)
assert.equal(JSON.stringify(initial), initialJson, 'server pipeline must not mutate its input snapshot')

let modelCalls = 0
const model = await executeStoryTurn({
  save: initial,
  cartridge: seventhDock,
  action: '检查航线册封面的盐渍',
  generator: {
    async send() {
      modelCalls += 1
      return {
        content: [
          '你把航线册封面移到防潮灯下，盐渍边缘露出三道反向刻痕。弥拉确认那不是潮水留下的，而是测绘员标记危险回流时使用的旧记号。',
          '[state: value="确认三道反向刻痕对应的回流位置"]',
          '[scene_location: location="第七码头 · 外堤"]',
          '[choices: "请弥拉在航图上标出回流位置"|"比较刻痕与外堤潮标的方向"]',
        ].join('\n'),
      }
    },
  },
})
assert.equal(model.source, 'model')
assert.equal(modelCalls, 1)
assert.equal(model.save.scene, initial.scene + 1)
assert.equal(model.save.objective, '确认三道反向刻痕对应的回流位置')
assert.ok(model.save.choices.length >= 1)

console.log(JSON.stringify({
  ok: true,
  checks: [
    'server-compatible-pure-turn-pipeline',
    'domain-action-bypasses-model',
    'authoritative-effects-commit-together',
    'input-snapshot-remains-immutable',
    'model-proposal-validates-before-commit',
  ],
}, null, 2))
