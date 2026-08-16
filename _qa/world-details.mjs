import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const pass = process.argv[2] || 'pass1'
const output = new URL('./ui/', import.meta.url)
await fs.mkdir(output, { recursive: true })
const shot = (name) => fileURLToPath(new URL(name, output))
const sceneFixture = fileURLToPath(new URL('../src/story/img/worlds/the-wild-road.webp', import.meta.url))
const browser = await chromium.launch({ headless: true })

async function pageFor({ width, height, cartridge, lang }) {
  const requests = []
  const page = await browser.newPage({ viewport: { width, height }, locale: lang === 'zh' ? 'zh-CN' : 'en-US' })
  await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }))
  await page.route('https://qa.local/generated-item.webp', (route) => route.fulfill({ path: sceneFixture, contentType: 'image/webp' }))
  await page.route('https://chat.aiwaves.tech/aigram/api/gen-image', (route) => {
    requests.push({ at: Date.now(), payload: route.request().postDataJSON() })
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ url: 'https://qa.local/generated-item.webp' }) })
  })
  await page.goto(`http://127.0.0.1:4175/?cartridge=${cartridge}&lang=${lang}&story_mode=demo`, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' })
  return { page, requests }
}

async function assertLayout(page, label) {
  const result = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth,
    targets: [...document.querySelectorAll('.st-drawer button')].map((node) => {
      const rect = node.getBoundingClientRect()
      return { name: node.getAttribute('aria-label') || node.textContent?.trim().slice(0, 30), width: rect.width, height: rect.height }
    }).filter((entry) => entry.width > 0 && entry.height > 0),
  }))
  if (result.body > result.viewport + 1) throw new Error(`${label}: horizontal overflow ${JSON.stringify(result)}`)
  const short = result.targets.filter((target) => target.height < 43.5 || target.width < 43.5)
  if (short.length) throw new Error(`${label}: undersized targets ${JSON.stringify(short)}`)
}

const wild = await pageFor({ width: 390, height: 844, cartridge: 'the-wild-road', lang: 'zh' })
await wild.page.getByRole('button', { name: '走向十字路口' }).click()
await wild.page.locator('.st-message-image.is-ready').waitFor()
await wild.page.getByRole('button', { name: '世界' }).click()
await wild.page.getByRole('button', { name: '行囊' }).click()
await wild.page.getByRole('button', { name: /没有标记的铁钥匙/ }).click()
await wild.page.getByText('作用与限制', { exact: true }).waitFor()
await wild.page.waitForTimeout(280)
await assertLayout(wild.page, 'wild-item')
await wild.page.screenshot({ path: shot(`wild-item-detail-${pass}-platform-layout-390x844.png`) })
await wild.page.getByRole('button', { name: '生成物品图' }).click()
await wild.page.getByText('物品图已存入行囊', { exact: true }).waitFor({ timeout: 10000 })
if (wild.requests.length < 2) throw new Error('item generation did not join the image queue')
const itemRequest = wild.requests.at(-1)
if (itemRequest.payload.ref_url) throw new Error('object-only item art unexpectedly used the player avatar reference')
if (!/no text|no letters/i.test(itemRequest.payload.prompt)) throw new Error('item prompt omitted the no-text rule')
if (itemRequest.at - wild.requests.at(-2).at < 2900) throw new Error('image requests were not spaced by at least three seconds')
await wild.page.screenshot({ path: shot(`wild-item-ready-${pass}-platform-layout-390x844.png`) })
await wild.page.close()

const dock = await pageFor({ width: 390, height: 844, cartridge: 'seventh-dock', lang: 'zh' })
await dock.page.getByRole('button', { name: '翻开第一程' }).click()
await dock.page.getByRole('button', { name: '世界' }).click()
await dock.page.locator('.st-roster .st-entity-row').filter({ hasText: '弥拉' }).click()
await dock.page.getByText('能力', { exact: true }).waitFor()
await dock.page.waitForTimeout(280)
await assertLayout(dock.page, 'dock-character')
await dock.page.screenshot({ path: shot(`dock-character-detail-${pass}-platform-layout-390x844.png`) })
await dock.page.close()

const apartment = await pageFor({ width: 320, height: 568, cartridge: 'rooftop-apartment', lang: 'zh' })
await apartment.page.getByRole('button', { name: '推开屋顶门' }).click()
await apartment.page.getByRole('button', { name: '世界' }).click()
await apartment.page.getByRole('button', { name: '房间' }).click()
await apartment.page.locator('.st-map .st-entity-row.is-current').click()
await apartment.page.getByText('已知事实', { exact: true }).waitFor()
await apartment.page.waitForTimeout(280)
await assertLayout(apartment.page, 'apartment-place')
await apartment.page.screenshot({ path: shot(`apartment-place-detail-${pass}-platform-layout-320x568.png`) })
await apartment.page.close()

console.log('world details visual ok · item queue + character + place · 390x844 / 320x568')
await browser.close()
