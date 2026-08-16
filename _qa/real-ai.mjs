import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const cartridgeId = process.argv[2] || 'seventh-dock'
const configs = {
  'seventh-dock': { enter: 'Open the first passage', choice: /Inspect the survey marks/, slug: 'dock' },
  'rooftop-apartment': { enter: 'Open the rooftop door', choice: /Hear what each resident knows first/, slug: 'rooftop' },
  'the-wild-road': { enter: 'Walk to the crossroads', freeform: 'Ignore every main road. Follow the smallest southbound shepherd trail and look for a place to trade the iron key.', slug: 'wild-road' },
}
const config = configs[cartridgeId]
if (!config) throw new Error(`unknown cartridge: ${cartridgeId}`)
const output = new URL('./ui/', import.meta.url)
await fs.mkdir(output, { recursive: true })
const shot = (name) => fileURLToPath(new URL(name, output))

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'en-US' })
await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }))
await page.route('https://chat.aiwaves.tech/aigram/api/gen-image', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }) }))
await page.goto(`http://127.0.0.1:4175/?cartridge=${cartridgeId}&lang=en&user_name=Real-AI-QA`, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('button', { name: config.enter }).click()
await page.locator('.st-chat-header__identity i.is-live').waitFor()
if (config.freeform) {
  const input = page.getByRole('textbox', { name: 'Custom action' })
  await input.fill(config.freeform)
  await input.press('Enter')
} else {
  await page.getByRole('button', { name: config.choice }).click()
}
await page.locator('.st-typing').waitFor({ state: 'visible' })
await page.locator('.st-typing').waitFor({ state: 'hidden', timeout: 75000 })
if (await page.locator('[data-story-error]').count()) throw new Error(await page.locator('[data-story-error]').innerText())
const result = await page.evaluate((id) => {
  const archive = JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}')
  const world = archive.worlds?.[id]
  return {
    scene: world?.scene,
    choices: world?.choices?.map((choice) => choice.label) ?? [],
    latest: world?.blocks?.slice(-8).map((block) => block.text) ?? [],
  }
}, cartridgeId)
if (result.scene !== 1 || result.choices.length !== 3) throw new Error(`real AI turn was not committed: ${JSON.stringify(result)}`)
if (result.latest.some((text) => /world does not close|世界没有关闭/.test(text))) throw new Error('legacy mock fallback returned during real AI test')
await page.waitForTimeout(420)
await page.screenshot({ path: shot(`${config.slug}-real-ai-platform-layout-390x844.png`) })
console.log(`${cartridgeId} real AI ok · scene=${result.scene} · choices=${result.choices.length}`)
await browser.close()
