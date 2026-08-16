import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const pass = process.argv[2] || 'pass1'
const output = new URL('./ui/', import.meta.url)
await fs.mkdir(output, { recursive: true })
const shot = (name) => fileURLToPath(new URL(name, output))
const browser = await chromium.launch({ headless: true })

async function makePage(width, height, cartridge, locale, hideBanner = true) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, locale: locale === 'zh' ? 'zh-CN' : 'en-US' })
  await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({ contentType: 'application/javascript', body: `document.body.insertAdjacentHTML('afterbegin','<div id="alteru-guest-banner" style="position:fixed;z-index:9999;inset:0 0 auto;height:52px;background:#111;color:white;display:flex;align-items:center;justify-content:center;font:12px sans-serif">ALTERU · OPEN IN APP</div>')` }))
  await page.route('https://chat.aiwaves.tech/aigram/api/gen-image', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
  await page.goto(`http://127.0.0.1:4175/?cartridge=${cartridge}&lang=${locale}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  if (hideBanner) await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' })
  return page
}

const dock = await makePage(390, 844, 'seventh-dock', 'en')
await dock.screenshot({ path: shot(`dock-entry-v04-${pass}-platform-layout-390x844.png`) })
await dock.getByRole('button', { name: 'Open the first passage' }).click()
await dock.waitForTimeout(320)
await dock.screenshot({ path: shot(`dock-core-v04-${pass}-platform-layout-390x844.png`) })
await dock.getByRole('button', { name: 'World' }).click()
await dock.waitForTimeout(250)
await dock.screenshot({ path: shot(`dock-world-v04-${pass}-platform-layout-390x844.png`) })
await dock.close()

const apartment = await makePage(320, 568, 'rooftop-apartment', 'zh')
await apartment.screenshot({ path: shot(`apartment-entry-v04-${pass}-platform-layout-320x568.png`) })
await apartment.getByRole('button', { name: '推开屋顶门' }).click()
await apartment.waitForTimeout(320)
await apartment.screenshot({ path: shot(`apartment-core-v04-${pass}-platform-layout-320x568.png`) })
await apartment.close()

const switched = await makePage(390, 844, 'seventh-dock', 'en')
await switched.getByRole('button', { name: 'Open the first passage' }).click()
await switched.getByRole('textbox', { name: 'Custom action' }).fill('我们先检查外堤上的痕迹')
await switched.getByRole('textbox', { name: 'Custom action' }).press('Enter')
await switched.getByRole('button', { name: '世界' }).waitFor()
await switched.waitForTimeout(1000)
await switched.screenshot({ path: shot(`dock-language-switch-v04-${pass}-platform-layout-390x844.png`) })
await switched.close()

const external = await makePage(390, 844, 'seventh-dock', 'en', false)
await external.screenshot({ path: shot(`dock-entry-v04-${pass}-external-guest-390x844.png`) })
await external.close()

await browser.close()
