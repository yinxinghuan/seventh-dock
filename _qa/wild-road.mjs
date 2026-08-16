import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const pass = process.argv[2] || 'pass1'
const width = Number(process.argv[3] || 390)
const height = width <= 320 ? 568 : 844
const output = new URL('./ui/', import.meta.url)
await fs.mkdir(output, { recursive: true })
const shot = (name) => fileURLToPath(new URL(name, output))
const sceneFixture = fileURLToPath(new URL('../src/story/img/worlds/the-wild-road.webp', import.meta.url))
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width, height }, locale: 'zh-CN' })
const base = 'http://127.0.0.1:4175/'
const generatedUrl = 'https://cdn.example.com/wild-road-scene.webp'
let chatPayload = null

await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }))
await page.route(generatedUrl, (route) => route.fulfill({ path: sceneFixture, contentType: 'image/webp' }))
await page.route('https://chat.aiwaves.tech/aigram/api/gen-image', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ url: generatedUrl }) }))
await page.route('https://chat.aiwaves.tech/aigram/api/game-chat', async (route) => {
  chatPayload = route.request().postDataJSON()
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ choices: [{ message: { content: `你没有走向任何一条路，而是爬上路碑旁的老橡树。高处的风把三条路同时展开：灰瓦村外停着一辆翻倒的货车，树林边缘有一缕不属于晨雾的蓝烟，北丘旧塔下则闪过一面铜镜。\n[clock: value="初夏第 1 天 · 08:35"]\n[state: value="决定从高处看到的三个异常中选择一个，或继续自己的计划"]\n[choices: "下树去帮助灰瓦村外的货车"|"留在树上观察树林边缘的蓝烟"|"记住旧塔的铜光，先沿南边小路离开"]` } }] }),
  })
})

async function assertNoOverflow(label) {
  const dimensions = await page.evaluate(() => ({ body: document.body.scrollWidth, root: document.documentElement.clientWidth }))
  if (dimensions.body > dimensions.root + 1) throw new Error(`${label}: horizontal overflow ${JSON.stringify(dimensions)}`)
}

await page.goto(`${base}?cartridge=the-wild-road&lang=zh&story_mode=demo`, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' })
await page.getByRole('heading', { name: '旷野之路' }).waitFor()
await assertNoOverflow('entry')
await page.screenshot({ path: shot(`wild-road-entry-${pass}-platform-layout-${width}x${height}.png`) })

await page.getByRole('button', { name: '走向十字路口' }).click()
await page.locator('.st-message-image.is-ready').waitFor()
await page.getByText('你也可以不走任何一条建议的路。', { exact: false }).waitFor()
await assertNoOverflow('opening')
await page.screenshot({ path: shot(`wild-road-opening-${pass}-platform-layout-${width}x${height}.png`) })

await page.getByRole('button', { name: '循着鹿蹄印进入西面的树林' }).click()
await page.getByText('初夏第 1 天 · 09:05', { exact: false }).waitFor()
const firstSave = await page.evaluate(() => JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}').worlds['the-wild-road'])
if (firstSave.stats.supplies !== 6 || firstSave.time !== '初夏第 1 天 · 09:05') throw new Error(`first open-world turn not persisted: ${JSON.stringify(firstSave)}`)
await page.screenshot({ path: shot(`wild-road-first-turn-${pass}-platform-layout-${width}x${height}.png`) })

await page.getByRole('button', { name: '沿记号深入树林' }).click()
await page.getByText('无名溪谷', { exact: true }).last().waitFor()
await page.locator('.st-message-image.is-ready').last().waitFor()
await page.getByRole('button', { name: '世界' }).click()
await page.getByRole('button', { name: '行囊' }).click()
await page.getByText('守路人的路镜', { exact: true }).waitFor()
await page.getByText('每次使用都会增加一道裂纹', { exact: false }).waitFor()
await assertNoOverflow('inventory')
await page.screenshot({ path: shot(`wild-road-treasure-${pass}-platform-layout-${width}x${height}.png`) })
await page.getByRole('button', { name: '关闭', exact: true }).click()

await page.reload({ waitUntil: 'networkidle' })
await page.locator('.st-shell--wayfarer').waitFor()
const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}').worlds['the-wild-road'])
if (restored.location !== '无名溪谷' || restored.inventory.at(-1)?.rarity !== 'rare') throw new Error('open-world location or treasure was not restored')

await page.evaluate(() => localStorage.clear())
await page.goto(`${base}?cartridge=the-wild-road&lang=zh`, { waitUntil: 'networkidle' })
await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' })
await page.getByRole('button', { name: '走向十字路口' }).click()
const input = page.getByRole('textbox', { name: '自定义行动' })
await input.fill('我不走任何一条路，先爬上路碑旁的橡树观察四周')
await input.press('Enter')
await page.getByText('爬上路碑旁的老橡树', { exact: false }).waitFor()
const system = String(chatPayload?.messages?.[0]?.content || '')
if (!system.includes('DIRECTOR MODE: open-world') || !system.includes('player may attempt any plausible in-world action')) throw new Error('open-world director contract was not sent to Aigram')
if (!String(chatPayload?.messages?.[1]?.content || '').includes('我不走任何一条路')) throw new Error('freeform action was not sent verbatim')
await assertNoOverflow('freeform')
await page.screenshot({ path: shot(`wild-road-freeform-${pass}-platform-layout-${width}x${height}.png`) })

console.log(`wild-road ok · ${width}x${height} · director + clock + delta clamp + treasure + restore + freeform`)
await browser.close()
