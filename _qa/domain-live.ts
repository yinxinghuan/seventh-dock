import assert from 'node:assert/strict'
import { listCartridges } from '../src/story/cartridges'
import { createInitialSave } from '../src/story/engine/reducer'
import { applyDomainResolution, resolveDomainAction } from '../src/story/engine/domainRules'

for (const locale of ['zh', 'en'] as const) {
  const cartridge = listCartridges(locale)[0]
  const action = cartridge.opening.choices[0]?.label
  assert.ok(action, `${locale}: opening action missing`)
  const save = createInitialSave(cartridge)
  const first = resolveDomainAction(save, cartridge, action)
  assert.equal(first?.status, 'accepted', `${locale}: opening transaction must resolve locally`)
  assert.ok(first?.effects.length, `${locale}: opening transaction must have authoritative effects`)
  applyDomainResolution(save, cartridge, first)
  const repeated = resolveDomainAction(save, cartridge, action)
  assert.equal(repeated?.status, 'rejected', `${locale}: opening transaction must not settle twice`)
  assert.deepEqual(repeated?.effects, [], `${locale}: rejected repeat must be atomic`)
}

console.log(JSON.stringify({ ok: true, checks: ['opening-local-transaction', 'authoritative-effects', 'repeat-rejection', 'atomic-rejection', 'zh-en'] }))

