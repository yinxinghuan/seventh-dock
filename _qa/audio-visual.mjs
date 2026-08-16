import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const url = process.env.STORY_QA_URL
const enterLabel = process.env.STORY_QA_ENTER
const output = process.env.STORY_QA_OUTPUT
const width = Number(process.env.STORY_QA_WIDTH || 390)
const height = width <= 320 ? 568 : 844
const external = process.env.STORY_QA_EXTERNAL === '1'
if (!url || !enterLabel || !output) throw new Error('STORY_QA_URL, STORY_QA_ENTER and STORY_QA_OUTPUT are required')

mkdirSync(dirname(output), { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width, height }, locale: 'zh-CN' })
await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({
  contentType: 'application/javascript',
  body: `document.body.insertAdjacentHTML('afterbegin','<div id="alteru-guest-banner" style="position:fixed;z-index:9999;inset:0 0 auto;height:52px;background:#111;color:white;display:flex;align-items:center;justify-content:center;font:12px sans-serif">ALTERU · OPEN IN APP</div>')`,
}))
await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
if (!external) await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' })
if (external) await page.locator('#alteru-guest-banner').waitFor({ state: 'visible' })
if (!external) {
  await page.getByRole('button', { name: enterLabel }).click()
  await page.getByRole('button', { name: '静音' }).waitFor({ state: 'visible' })
}
await page.screenshot({ path: output })
console.log(`audio visual ok · ${external ? 'external-guest' : 'platform-layout'} · ${width}x${height}`)
await browser.close()
