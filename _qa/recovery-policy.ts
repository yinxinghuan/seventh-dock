import { listCartridges } from '../src/story/cartridges/index'
import { domainSuppressesDanger, resolveDomainAction } from '../src/story/engine/domainRules'
import { applyParsedScene, createInitialSave } from '../src/story/engine/reducer'
import { parseStoryProtocol } from '../src/story/engine/protocol'
import type { StoryCartridge } from '../src/story/types'

function ok(value: unknown, message: string): asserts value { if (!value) throw new Error(message) }
function equal(actual: unknown, expected: unknown, message: string) { if (actual !== expected) throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`) }

const source = listCartridges('en')[0]
const statId = source.statDefinitions[0].id
const cartridge: StoryCartridge = {
  ...source,
  statDefinitions: source.statDefinitions.map((definition, index) => index === 0
    ? { ...definition, min: 0, max: 100, initial: 40, maxDelta: 24, domainMaxDelta: 36, floorRule: undefined }
    : { ...definition }) as StoryCartridge['statDefinitions'],
  domainRules: {
    rules: [
      {
        id: 'qa-rest', intent: 'rest briefly', match: ['rest'], intentGuard: 'rest-commitment', dangerPolicy: 'suppress',
        requirements: [{ type: 'danger', phases: ['calm'], reason: 'The immediate danger must be addressed before resting.' }],
        effects: [{ type: 'stat', id: statId, delta: 8 }], successText: 'You rest for forty-five minutes.', successChoices: ['Rest again'],
      },
      {
        id: 'qa-withdraw', intent: 'withdraw to rest', match: ['withdraw to a rest area'], intentGuard: 'rest-commitment', dangerPolicy: 'withdraw',
        requirements: [], effects: [{ type: 'stat', id: statId, delta: 16 }], successText: 'You withdraw to safety and recover.', successChoices: ['Rest'],
      },
      {
        id: 'qa-overnight', intent: 'rest until morning', match: ['rest until morning'], dangerPolicy: 'suppress',
        requirements: [{ type: 'danger', phases: ['calm'], reason: 'The immediate danger must be addressed before sleeping.' }],
        effects: [{ type: 'stat', id: statId, delta: 36 }], successText: 'You sleep until morning.', successChoices: ['Continue'],
      },
    ],
  },
}

const ordinary = createInitialSave(cartridge)
ordinary.stats[statId] = 40
const contextual = resolveDomainAction(ordinary, cartridge, 'Rest for a while inside the newly discovered hut')
ok(contextual, 'contextual rest should resolve locally')
equal(contextual.ruleId, 'qa-rest', 'broad rest must keep its stable local rule')
ok(domainSuppressesDanger(contextual), 'accepted rest must suppress same-turn danger scheduling')
const rested = applyParsedScene(ordinary, parseStoryProtocol('[widget: unknown, remove: 99]', 'en'), cartridge, 'Rest for a while inside the newly discovered hut', undefined, undefined, {
  phase: 'resolution', severity: 5, threat: 'hostile injected danger', methods: ['ask', 'pay', 'withdraw'], physicalCombat: 'none',
  check: { skill: 'Judgment', dc: 15, roll: 1, modifier: 0, total: 1, outcome: 'critical-failure' },
}, contextual)
equal(rested.stats[statId], 48, 'rest recovery cannot be reversed by a same-turn danger directive')

equal(resolveDomainAction(ordinary, cartridge, 'Ask where I can rest'), undefined, 'rest inquiry is not action consent')
equal(resolveDomainAction(ordinary, cartridge, 'Tell Rowan I only want to rest tonight'), undefined, 'reported rest intent is not immediate action')
equal(resolveDomainAction(ordinary, cartridge, "Don't rest; keep watching"), undefined, 'negated rest is not immediate action')
const overnight = resolveDomainAction(ordinary, cartridge, 'Rest until morning')
ok(overnight, 'overnight rule resolves')
const afterNight = applyParsedScene(ordinary, parseStoryProtocol(overnight.successText, 'en'), cartridge, 'Rest until morning', undefined, undefined, undefined, overnight)
equal(afterNight.stats[statId], 76, 'trusted domain recovery uses domainMaxDelta 36')

const danger = createInitialSave(cartridge)
danger.stats[statId] = 0
danger.danger = { phase: 'confrontation', safeTurns: 0, cycle: 1, cooldownTurns: 0, severity: 4, currentThreat: 'active threat', lastOutcome: 'none' }
const blocked = resolveDomainAction(danger, cartridge, 'Rest here')
equal(blocked?.status, 'rejected', 'ordinary rest is blocked during active danger')
equal(blocked?.effects.length, 0, 'blocked rest is atomic')
const withdrawal = resolveDomainAction(danger, cartridge, 'Withdraw to a rest area')
ok(withdrawal, 'withdrawal remains available at the stat floor')
equal(withdrawal.status, 'accepted', 'withdrawal is accepted during danger')
ok(withdrawal.effects.some((effect) => effect.type === 'danger'), 'withdrawal owns danger resolution')
const safe = applyParsedScene(danger, parseStoryProtocol(withdrawal.successText, 'en'), cartridge, 'Withdraw to a rest area', undefined, undefined, undefined, withdrawal)
equal(safe.stats[statId], 16, 'withdrawal restores an exact amount')
equal(safe.danger.phase, 'calm', 'withdrawal clears active danger')

console.log(JSON.stringify({ ok: true, checks: ['contextual-rest', 'inquiry-guard', 'domain-max-delta', 'danger-block', 'danger-withdrawal', 'reducer-danger-defense'] }))
