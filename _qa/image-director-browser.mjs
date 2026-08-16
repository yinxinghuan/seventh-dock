import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'zh-CN' })
let generated = 0
let generatedImageUrl = 'http://127.0.0.1:4176/'

await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }))
await page.route('https://chat.aiwaves.tech/aigram/api/gen-image', (route) => {
  generated += 1
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ url: generatedImageUrl }) })
})

await page.goto('http://127.0.0.1:4176/?story_mode=demo&lang=zh', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
generatedImageUrl = new URL(await page.locator('.st-entry__scene img').getAttribute('src'), page.url()).href
await page.getByRole('button', { name: '走向十字路口' }).click()
await page.getByRole('button', { name: /循着鹿蹄印进入西面的树林/ }).click()
await page.getByRole('button', { name: /沿记号深入树林/ }).waitFor({ state: 'visible' })
await page.getByRole('button', { name: /沿记号深入树林/ }).click()
await page.getByRole('button', { name: /用路镜查看猎人去了哪里/ }).waitFor({ state: 'visible' })
await page.getByRole('button', { name: /用路镜查看猎人去了哪里/ }).click()
await page.getByText(/这段旅程随时可以继续/).waitFor({ state: 'visible' })
await page.waitForFunction(() => document.querySelectorAll('.st-message-image').length === 3)
await page.waitForFunction(() => document.querySelectorAll('.st-message-image.is-ready').length === 3, null, { timeout: 15000 })

const imageBlocks = await page.locator('.st-message-image').evaluateAll((nodes) => nodes.map((node) => ({
  id: node.getAttribute('data-block-id'),
  className: node.className,
})))
if (imageBlocks.map((block) => block.id).join(',') !== 'image-0,image-2,image-3') throw new Error(`unexpected scene image cadence: ${JSON.stringify(imageBlocks)}`)
if (generated !== 3) throw new Error(`expected three serialized scene generations, received ${generated}`)

mkdirSync('_qa/ui', { recursive: true })
await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' })
await page.screenshot({ path: '_qa/ui/platform-layout-image-director-checkpoint-390x844.png', fullPage: false })
await page.setViewportSize({ width: 320, height: 568 })
await page.screenshot({ path: '_qa/ui/platform-layout-image-director-checkpoint-320x568.png', fullPage: false })

console.log('image director browser ok · opening + AI proposal + local checkpoint fallback · serialized=3')
await browser.close()
