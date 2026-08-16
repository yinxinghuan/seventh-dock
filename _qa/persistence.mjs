import { chromium } from 'playwright'
import { installMediaMock } from './media-mock.mjs'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }))
await installMediaMock(page)

const base = 'http://127.0.0.1:4175/'
await page.goto(`${base}?cartridge=seventh-dock&lang=zh&story_mode=demo`, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('button', { name: '翻开第一程' }).click()
await page.waitForTimeout(80)

await page.evaluate(() => {
  const key = 'stateful-story-template-save'
  const archive = JSON.parse(localStorage.getItem(key) || '{}')
  const world = archive.worlds['seventh-dock']
  world.scene = 1
  world.blocks.push(
    { id: 'action-loop', kind: 'event', text: '沿着新线索继续调查' },
    { id: 'loop-copy', kind: 'narration', text: '你把“沿着新线索继续调查”写进了这页手记。世界没有关闭，只是把新的线索推到下一页。' },
  )
  world.choices = [{ id: 'loop', label: '沿着新线索继续调查' }]
  const lamp = world.inventory.find((item) => item.id === 'lamp')
  delete lamp.detail; delete lamp.effect; delete lamp.lore; delete lamp.metrics; delete lamp.imagePrompt
  const outer = world.map.find((node) => node.id === 'outer')
  delete outer.detail; delete outer.lore; delete outer.facts
  localStorage.setItem(key, JSON.stringify(archive))
})
await page.reload({ waitUntil: 'networkidle' })
await page.locator('.st-chat-header').waitFor()
const repaired = await page.evaluate(() => JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}').worlds['seventh-dock'])
if (repaired.scene !== 0 || repaired.blocks.some((block) => block.id === 'loop-copy' || block.id === 'action-loop')) throw new Error('legacy mock loop was not repaired')
if (!repaired.inventory.find((item) => item.id === 'lamp')?.effect || !repaired.map.find((node) => node.id === 'outer')?.facts?.length) throw new Error('legacy world entities were not enriched from the current cartridge')

await page.evaluate(() => {
  const key = 'stateful-story-template-save'
  const archive = JSON.parse(localStorage.getItem(key) || '{}')
  archive.worlds['seventh-dock'].remoteChatId = 'qa-persisted-world'
  localStorage.setItem(key, JSON.stringify(archive))
})
await page.goto(`${base}?cartridge=seventh-dock&lang=zh&story_mode=demo`, { waitUntil: 'networkidle' })
if (new URL(page.url()).searchParams.get('chat_id') !== 'qa-persisted-world') throw new Error('saved chatId was not restored into the URL')
if (await page.locator('.st-chat-header__identity i.is-live').count() !== 1) throw new Error('restored world did not switch to remote mode')

await page.goto(`${base}?cartridge=rooftop-apartment&lang=zh&story_mode=demo`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: '推开屋顶门' }).click()
await page.waitForTimeout(80)
const worlds = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}').worlds || {}).sort())
if (JSON.stringify(worlds) !== JSON.stringify(['rooftop-apartment', 'seventh-dock'])) throw new Error(`cartridge archive mismatch: ${worlds.join(',')}`)

await page.goto(`${base}?cartridge=the-wild-road&lang=zh&story_mode=demo`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: '走向十字路口' }).click()
await page.waitForTimeout(80)
await page.evaluate(() => {
  const key = 'stateful-story-template-save'
  const archive = JSON.parse(localStorage.getItem(key) || '{}')
  const world = archive.worlds['the-wild-road']
  world.version = 4
  delete world.characters
  delete world.partyMemberIds
  world.blocks.push(
    { id: 'effect-legacy-join-a', kind: 'event', text: '阿岚加入了同行者' },
    { id: 'effect-legacy-join-b', kind: 'event', text: '伊芙加入了同行者' },
  )
  localStorage.setItem(key, JSON.stringify(archive))
})
await page.reload({ waitUntil: 'networkidle' })
const migratedParty = await page.evaluate(() => {
  const world = JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}').worlds['the-wild-road']
  return { version: world.version, names: world.partyMemberIds.map((id) => world.characters.find((character) => character.id === id)?.name).sort() }
})
if (migratedParty.version !== 10 || JSON.stringify(migratedParty.names) !== JSON.stringify(['伊芙', '阿岚'])) throw new Error(`legacy party migration mismatch: ${JSON.stringify(migratedParty)}`)
await page.locator('.st-world-button').click()
await page.getByRole('button', { name: /阿岚/ }).waitFor()
await page.getByRole('button', { name: /伊芙/ }).waitFor()

await page.evaluate(() => {
  const key = 'stateful-story-template-save'
  const archive = JSON.parse(localStorage.getItem(key) || '{}')
  const world = archive.worlds['the-wild-road']
  world.scene = 6
  world.location = '湖畔仓库'
  world.blocks = world.blocks.filter((block) => block.kind !== 'image')
  delete world.imagePrompt
  delete world.imageUrl
  delete world.imageStatus
  localStorage.setItem(key, JSON.stringify(archive))
})
await page.reload({ waitUntil: 'networkidle' })
const migratedImages = await page.evaluate(() => JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}').worlds['the-wild-road'].blocks.filter((block) => block.kind === 'image'))
if (migratedImages.length) throw new Error('later legacy save recreated an opening-scene image fallback')

console.log(`persistence ok · mock-loop repaired · restored_chat=qa-persisted-world · worlds=${worlds.length + 1} · migrated_party=${migratedParty.names.length} · no late opening fallback`)
await browser.close()
