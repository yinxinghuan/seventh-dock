import { strict as assert } from 'node:assert'
import { listCartridges } from '../src/story/cartridges/index'
import { parseStoryProtocol } from '../src/story/engine/protocol'
import { applyParsedScene, createInitialSave, normalizeCharacterState, updateCharacterVisualIdentity } from '../src/story/engine/reducer'
import { prepareTurnCandidate } from '../src/story/engine/turnPipeline'
import { generateMediaImage } from '../src/shared/runtime/media'

const cartridge = listCartridges('zh')[0]
let save = createInitialSave(cartridge)
const valid = `屋檐下，一个戴绿铜胸针的成年女人正扶起倒下的路牌。摊主喊她“伊莱拉”；她回头说明自己熟悉旧桥，也愿意和你一起去确认潮位。
[伊莱拉] [main] [坦率]: "旧桥还能走，但我们得在涨潮前回来。"
[character_update: character_id="elara-venn" character="伊莱拉" role="30 岁 · 旧桥向导" visual_appearance="One adult woman age 30, short black curls, green copper brooch, ochre raincoat" visual_traits="age 30|short black curls|green copper brooch" visual_wardrobe="ochre raincoat" visual_forbidden="age drift|hair drift|missing brooch"]
[party_change: character_id="elara-venn" character="伊莱拉" change="add"]
[reputation: npc="伊莱拉" action="trusted"]
[choices: "和伊莱拉去旧桥"|"询问涨潮时间"]`
const candidate = prepareTurnCandidate({ save, parsed: parseStoryProtocol(valid, 'zh'), cartridge, action: '和新认识的人交谈' })
assert.deepEqual(candidate.violations, [])
save = applyParsedScene(save, candidate.parsed, cartridge, '和新认识的人交谈')
let generated = save.characters.find((character) => character.id === 'elara-venn')
assert.equal(generated?.origin, 'generated')
assert.equal(generated?.visualIdentity?.status, 'queued')
assert.ok(save.partyMemberIds.includes('elara-venn'))
assert.equal(save.relationships.at(-1)?.characterId, 'elara-venn')
assert.equal([...save.blocks].reverse().find((block) => block.kind === 'image')?.data?.identityCharacterId, 'elara-venn')

save = updateCharacterVisualIdentity(save, 'elara-venn', { status: 'anchored', anchorTaskId: 'qa-anchor-task-001' })
const restored = normalizeCharacterState(JSON.parse(JSON.stringify(save)), cartridge)
generated = restored.characters.find((character) => character.id === 'elara-venn')
assert.equal(generated?.visualIdentity?.anchorTaskId, 'qa-anchor-task-001')
assert.ok(restored.partyMemberIds.includes('elara-venn'))
assert.equal(restored.relationships.at(-1)?.characterId, 'elara-venn')
assert.ok(!('url' in (generated?.visualIdentity ?? {})))

const silent = `这里只有雨声，没有任何人出现。
[character_update: character_id="silent-stranger" character="未露面的陌生人" role="向导" visual_appearance="One adult guide" visual_traits="adult"]
[choices: "继续等待"]`
const silentCandidate = prepareTurnCandidate({ save: createInitialSave(cartridge), parsed: parseStoryProtocol(silent, 'zh'), cartridge, action: '等待' })
assert.ok(silentCandidate.violations.includes('character.new_character_requires_visible_debut'))
assert.ok(!applyParsedScene(createInitialSave(cartridge), silentCandidate.parsed, cartridge, '等待').characters.some((character) => character.id === 'silent-stranger'))

const rename = `远处另一个男人自称诺兰。
[character_update: character_id="elara-venn" character="诺兰" role="45 岁 · 商人"]
[choices: "和诺兰交谈"]`
const renameCandidate = prepareTurnCandidate({ save, parsed: parseStoryProtocol(rename, 'zh'), cartridge, action: '观察' })
assert.ok(renameCandidate.violations.includes('character.id_cannot_change_identity'))
assert.equal(applyParsedScene(save, renameCandidate.parsed, cartridge, '观察').characters.find((character) => character.id === 'elara-venn')?.name, '伊莱拉')

const missingIdentity = `桥边一个成年男人正在系紧缆绳。木牌写着“沈岸”；沈岸说愿意带你过桥。
[character_update: character_id="shen-an" character="沈岸" role="34 岁 · 摆渡人"]
[choices: "请沈岸带路"]`
assert.ok(prepareTurnCandidate({ save: createInitialSave(cartridge), parsed: parseStoryProtocol(missingIdentity, 'zh'), cartridge, action: '过桥' }).violations.includes('character.generated_character_requires_visual_identity'))

const bodies: Record<string, unknown>[] = []
const originalFetch = globalThis.fetch
globalThis.fetch = async (_input, init) => {
  bodies.push(JSON.parse(String(init?.body ?? '{}')))
  const index = bodies.length
  return new Response(JSON.stringify({
    task_id: index === 1 ? 'qa-anchor-task-001' : 'qa-scene-task-001',
    request_id: String(bodies.at(-1)?.request_id),
    status: 'succeeded',
    media: { type: 'image', url: index === 1 ? 'https://example.test/anchor.png' : 'https://example.test/scene.png', width: 512, height: 640, format: 'png' },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
try {
  const anchor = await generateMediaImage({ sessionId: '00000000-0000-4000-8000-000000000001', prompt: 'canonical adult identity anchor', mode: 'text', width: 512, height: 640, requestId: 'anchor-request' })
  const scene = await generateMediaImage({ sessionId: '00000000-0000-4000-8000-000000000001', prompt: 'same character in a new scene', mode: 'edit', referenceUrl: anchor.url, requestId: 'scene-request' })
  assert.equal(anchor.taskId, 'qa-anchor-task-001')
  assert.equal(scene.taskId, 'qa-scene-task-001')
  assert.equal(bodies[0].mode, 'text')
  assert.deepEqual(bodies[0].reference_urls, [])
  assert.deepEqual(bodies[0].size, { width: 512, height: 640 })
  assert.equal(bodies[1].mode, 'edit')
  assert.deepEqual(bodies[1].reference_urls, ['https://example.test/anchor.png'])
} finally {
  globalThis.fetch = originalFetch
}

console.log(JSON.stringify({ ok: true, checks: ['visible-generated-debut', 'stable-id', 'identity-required', 'party-relationship-binding', 'anchor-task-reload', 'image-owner-binding', 'hidden-command-rejection', 'id-rename-rejection', 'public-media-text-anchor', 'public-media-edit-reuse', 'ephemeral-url-exclusion'] }))

