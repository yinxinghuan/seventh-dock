import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const url = process.env.STORY_DESKTOP_URL
const enterLabel = process.env.STORY_DESKTOP_ENTER
const outputPrefix = process.env.STORY_DESKTOP_OUTPUT_PREFIX
const width = Number(process.env.STORY_DESKTOP_WIDTH || 1440)
const height = Number(process.env.STORY_DESKTOP_HEIGHT || 900)

if (!url || !enterLabel || !outputPrefix) {
  throw new Error('STORY_DESKTOP_URL, STORY_DESKTOP_ENTER and STORY_DESKTOP_OUTPUT_PREFIX are required')
}

mkdirSync(dirname(outputPrefix), { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width, height }, locale: 'zh-CN' })
page.setDefaultTimeout(12_000)

await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({
  contentType: 'application/javascript',
  body: `document.body.insertAdjacentHTML('afterbegin','<div id="alteru-guest-banner" style="position:fixed;z-index:9999;inset:0 0 auto;height:52px;background:#111;color:white;display:flex;align-items:center;justify-content:center;font:12px sans-serif">ALTERU · OPEN IN APP</div>')`,
}))
await page.route('**/aigram/api/gen-image', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"qa"}' }))
await page.route('**/note/telegram/user/get/info/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":{"name":"Desktop Explorer","head_url":""}}' }))

await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'domcontentloaded' })
await page.locator('.st-entry').waitFor({ state: 'visible' })
await page.locator('#alteru-guest-banner').waitFor({ state: 'visible' })
await page.screenshot({ path: `${outputPrefix}-external-guest-${width}x${height}.png` })

await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' })
const enterButton = page.locator('.st-primary')
await enterButton.waitFor({ state: 'visible' })
const actualEnterLabel = (await enterButton.innerText()).trim()
if (!actualEnterLabel.includes(enterLabel)) throw new Error(`Expected entry action containing "${enterLabel}", got "${actualEnterLabel}"`)
await enterButton.click()
await page.locator('.st-shell').waitFor({ state: 'visible' })
await page.locator('.st-narration').first().waitFor({ state: 'visible' })

const metrics = await page.evaluate(() => {
  const rect = (selector) => {
    const node = document.querySelector(selector)
    if (!node) return null
    const box = node.getBoundingClientRect()
    return { x: Math.round(box.x), width: Math.round(box.width), left: Math.round(box.left), right: Math.round(box.right) }
  }
  return {
    viewport: { width: innerWidth, height: innerHeight },
    documentScrollWidth: document.documentElement.scrollWidth,
    shell: rect('.st-shell'),
    conversation: rect('.st-conversation'),
    narration: rect('.st-narration'),
    replies: rect('.st-quick-replies'),
    composer: rect('.st-composer form'),
  }
})

await page.screenshot({ path: `${outputPrefix}-platform-layout-${width}x${height}.png` })
console.log(JSON.stringify(metrics, null, 2))
await browser.close()
