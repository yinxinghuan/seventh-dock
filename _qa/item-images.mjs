import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const itemRequests = []

await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }))
await page.route('https://game.aiwaves.tech/alteru-media/api/v1/images/generations', async (route) => {
  const body = route.request().postDataJSON()
  if (String(body.prompt).includes('inventory artifact plate')) {
    itemRequests.push(body)
    await new Promise((resolve) => setTimeout(resolve, 1800))
  }
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      task_id: `qa-item-task-${itemRequests.length || 1}`,
      request_id: body.request_id,
      status: 'succeeded',
      media: { type: 'image', url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', width: 512, height: 512, format: 'png' },
    }),
  })
})

const base = 'http://127.0.0.1:4175/'
await page.goto(`${base}?cartridge=the-wild-road&lang=zh&story_mode=demo`, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('button', { name: '走向十字路口' }).click()
await page.waitForTimeout(250)

await page.evaluate(() => {
  const key = 'stateful-story-template-save'
  const archive = JSON.parse(localStorage.getItem(key) || '{}')
  const knife = archive.worlds['the-wild-road'].inventory.find((item) => item.id === 'knife')
  knife.imageUrl = 'https://legacy.invalid/mismatched-item.jpg'
  knife.imageStatus = 'ready'
  delete knife.imageStyleVersion
  localStorage.setItem(key, JSON.stringify(archive))
})
await page.reload({ waitUntil: 'networkidle' })

await page.getByRole('button', { name: '打开人物关系与旅途手册' }).click()
await page.getByRole('button', { name: '行囊' }).click()
await page.locator('.st-inventory-reveal').waitFor({ state: 'visible' })
if (!await page.locator('.st-inventory-reveal').getByText('旅记正在描摹行囊').isVisible()) throw new Error('in-world first reveal explanation is missing')
mkdirSync('_qa/ui', { recursive: true })
await page.screenshot({ path: '_qa/ui/platform-layout-item-reveal-390x844.png' })
await page.setViewportSize({ width: 320, height: 568 })
await page.screenshot({ path: '_qa/ui/platform-layout-item-reveal-320x568.png' })
await page.setViewportSize({ width: 390, height: 844 })

const queued = await page.evaluate(() => {
  const archive = JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}')
  return archive.worlds['the-wild-road'].inventory.find((item) => item.id === 'knife')
})
if (queued.imageUrl !== 'https://legacy.invalid/mismatched-item.jpg' || !['queued', 'generating'].includes(queued.imageStatus)) throw new Error('legacy item art was not safely queued for replacement')

await page.locator('.st-inventory .st-entity-row').first().click()
if (await page.locator('.st-item-illustration button').count()) throw new Error('manual item generation control still exists')
await page.screenshot({ path: '_qa/ui/platform-layout-item-detail-generating-390x844.png' })

await page.waitForTimeout(3300)
if (!itemRequests.length) throw new Error('opening inventory did not start background item generation')
const firstPrompt = String(itemRequests[0].prompt)
if (!firstPrompt.includes('wayfarer field-journal artifact study') || !firstPrompt.includes('single worn traveler short knife')) throw new Error('item content and cartridge art direction were not combined')
if (itemRequests[0].mode !== 'text' || itemRequests[0].reference_urls?.length) throw new Error('inventory generation still uses the cover as an img2img reference')
if (!firstPrompt.includes('Do not borrow any location, landmark, character, composition, or prop')) throw new Error('item prompt does not explicitly reject cover and opening-scene content')

await page.waitForFunction(() => {
  const archive = JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}')
  const knife = archive.worlds?.['the-wild-road']?.inventory?.find((item) => item.id === 'knife')
  return knife?.imageStatus === 'ready' && knife?.imageStyleVersion === 2
}, null, { timeout: 5000 })

for (const cartridge of [
  { id: 'seventh-dock', lang: 'zh', world: '打开人物关系与旅途手册', enter: '翻开第一程', inventory: '行囊', file: 'platform-layout-seventh-dock-item-reveal-390x844.png' },
  { id: 'rooftop-apartment', lang: 'zh', world: '打开人物关系与旅途手册', enter: '推开屋顶门', inventory: '公共柜', file: 'platform-layout-rooftop-apartment-item-reveal-390x844.png' },
  { id: 'the-wild-road', lang: 'en', world: 'Open relationships and travel folio', enter: 'Walk to the crossroads', inventory: 'Pack', file: 'platform-layout-the-wild-road-item-reveal-en-390x844.png' },
]) {
  await page.goto(`${base}?cartridge=${cartridge.id}&lang=${cartridge.lang}&story_mode=demo`, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: cartridge.enter }).click()
  await page.waitForTimeout(100)
  await page.getByRole('button', { name: cartridge.world }).click()
  await page.getByRole('button', { name: cartridge.inventory }).click()
  await page.locator('.st-inventory-reveal').waitFor({ state: 'visible' })
  await page.screenshot({ path: `_qa/ui/${cartridge.file}` })
  await page.waitForTimeout(1900)
}

console.log(`item imaging ok · automatic queue · text-only style grounding · no cover ref · themed layouts=4 · version=${2}`)
await browser.close()
