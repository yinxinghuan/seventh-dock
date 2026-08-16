import assert from 'node:assert/strict'
import { seventhDock } from '../src/story/cartridges/seventhDock'
import { resolveDomainAction, statFloorChoices } from '../src/story/engine/domainRules'
import { parseStoryProtocol } from '../src/story/engine/protocol'
import { applyParsedScene, createInitialSave } from '../src/story/engine/reducer'
import type { StoryCartridge } from '../src/story/types'

const cartridge: StoryCartridge = {
  ...seventhDock,
  initialFacts: { 'signal-used': false },
  domainRules: { derivedFacts: [{ factId: 'lamp-count', mode: 'owned-item-count', itemIds: ['lamp'] }], rules: [{
    id: 'use-signal-lamp', intent: 'use-signal-lamp', match: ['点亮信号灯', '使用信号灯'],
    requirements: [
      { type: 'map', nodeId: 'outer', reason: '信号只能从外堤发出' },
      { type: 'fact', id: 'signal-used', notEquals: true, reason: '信号已经发出' },
      { type: 'item', id: 'lamp', minCount: 1, reason: '防潮灯已经不在行囊中' },
    ],
    effects: [
      { type: 'stat', id: 'supplies', delta: -2 },
      { type: 'fact', id: 'signal-used', value: true },
      { type: 'inventory', action: 'remove', itemId: 'lamp', count: 1 },
      { type: 'map', nodeId: 'wreck' },
      { type: 'objective', value: '登上回应信号的渡船' },
      { type: 'clock', value: '退潮前十分钟' },
      { type: 'session', ended: false },
    ],
    successText: '灯光引来渡船，代价与位置一次结清。',
    successChoices: ['靠岸', '观察回应', '掩护同伴', '检查潮位', '记录信号'], rejectionChoices: ['检查行囊', '观察潮位', '寻找其他信号'],
  }] },
}

let save = createInitialSave(cartridge)
const resolution = resolveDomainAction(save, cartridge, '现在点亮信号灯')
assert.equal(resolution?.status, 'accepted')
save = applyParsedScene(save, parseStoryProtocol('[widget: alert, add: 80]\n[widget: supplies, add: 9]\n[inventory: action="add" item="凭空物资" count="7"]\n[map_update: new_location="模型地点"]\n[state: value="模型目标"]\n[clock: value="模型时间"]\n[session_end: reason="模型提前结束"]\n[choices: "错误一"|"错误二"|"错误三"]', 'zh'), cartridge, '现在点亮信号灯', undefined, undefined, undefined, resolution)
assert.equal(save.stats.supplies, 6)
assert.equal(save.stats.alert, 15)
assert.equal(save.facts['signal-used'], true)
assert.equal(save.inventory.some((item) => item.label === '凭空物资'), false)
assert.equal(save.inventory.some((item) => item.id === 'lamp'), false)
assert.equal(save.map.find((node) => node.current)?.id, 'wreck')
assert.equal(save.objective, '登上回应信号的渡船')
assert.equal(save.time, '退潮前十分钟')
assert.equal(save.sessionEnded, false)
assert.equal(save.facts['lamp-count'], 0)
assert.deepEqual(save.choices.map((choice) => choice.label), ['靠岸', '观察回应', '掩护同伴', '检查潮位', '记录信号'])

const repeated = resolveDomainAction(save, cartridge, '再使用信号灯')
assert.equal(repeated?.status, 'rejected')
save.danger = { ...save.danger, phase: 'confrontation', safeTurns: 0, severity: 3 }
const afterRepeat = applyParsedScene(save, parseStoryProtocol('[widget: supplies, add: 9]\n[choices: "检查行囊"|"观察潮位"|"寻找其他信号"]', 'zh'), cartridge, '再使用信号灯', undefined, undefined, undefined, repeated)
assert.equal(afterRepeat.stats.supplies, 6)
assert.equal(afterRepeat.danger.phase, 'confrontation')
assert.equal(afterRepeat.danger.safeTurns, 0)
assert.deepEqual(afterRepeat.choices.map((choice) => choice.label), ['检查行囊', '观察潮位', '寻找其他信号'])

const floorCartridge: StoryCartridge = {
  ...seventhDock,
  statDefinitions: seventhDock.statDefinitions.map((stat) => stat.id !== 'supplies' ? stat : {
    ...stat,
    description: '补给用于长距离行动；归零后必须先恢复。',
    floorRule: {
      threshold: 0,
      enteredText: '补给已经耗尽，无法继续深入。',
      blockedText: '这项行动需要补给；请先恢复。',
      recoveryChoices: ['整理现有物资', '返回补给点', '结束今天'],
      allowedDomainRuleIds: ['recover-supplies'],
    },
  }) as StoryCartridge['statDefinitions'],
  domainRules: { rules: [{
    id: 'recover-supplies', intent: '恢复补给', match: ['整理现有物资'], requirements: [],
    effects: [{ type: 'stat', id: 'supplies', delta: 2 }], successText: '你整理出还能使用的物资。',
    successChoices: ['继续调查', '查看潮位', '检查航线'],
  }] },
}
const exhausted = createInitialSave(floorCartridge)
exhausted.stats.supplies = 0
const blockedAtFloor = resolveDomainAction(exhausted, floorCartridge, '继续进入沉船巷')
assert.equal(blockedAtFloor?.ruleId, 'stat-floor-supplies')
assert.deepEqual(statFloorChoices(exhausted, floorCartridge)?.map((choice) => choice.label), ['整理现有物资', '返回补给点', '结束今天'])
const allowedRecovery = resolveDomainAction(exhausted, floorCartridge, '整理现有物资')
assert.equal(allowedRecovery?.status, 'accepted')
const recoveredAtFloor = applyParsedScene(exhausted, parseStoryProtocol(allowedRecovery!.successText, 'zh'), floorCartridge, '整理现有物资', undefined, undefined, undefined, allowedRecovery)
assert.equal(recoveredAtFloor.stats.supplies, 2)

const nearlyExhausted = createInitialSave(floorCartridge)
nearlyExhausted.stats.supplies = 1
const enteredFloor = applyParsedScene(nearlyExhausted, parseStoryProtocol('[widget: supplies, remove: 1]\n[choices: "继续深入"|"翻越堤坝"|"追赶目标"]', 'zh'), floorCartridge, '继续深入')
assert.equal(enteredFloor.stats.supplies, 0)
assert.equal(enteredFloor.blocks.some((block) => block.data?.statFloor === 'supplies'), true)
assert.deepEqual(enteredFloor.choices.map((choice) => choice.label), ['整理现有物资', '返回补给点', '结束今天'])

console.log(JSON.stringify({ ok: true, atomicTurn: true, repeatRejected: true, statFloorBlocked: true, recoveryAllowed: true, immediateFloorNotice: true }))
