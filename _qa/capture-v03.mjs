import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const pass = process.argv[2] || 'pass1'
const output = new URL('./ui/', import.meta.url)
await fs.mkdir(output, { recursive: true })
const shot = (name) => fileURLToPath(new URL(name, output))
const browser = await chromium.launch({ headless: true })

const sceneSvg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#244d54"/><circle cx="570" cy="145" r="83" fill="#d3a653" opacity=".64"/><path d="M0 455L195 330 320 430 470 270 800 470V600H0Z" fill="#0d2326"/></svg>`)

async function makePage(width, height, hideBanner = true, cartridge = 'seventh-dock') {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({ contentType: 'application/javascript', body: `document.body.insertAdjacentHTML('afterbegin','<div id="alteru-guest-banner" style="position:fixed;z-index:9999;inset:0 0 auto;height:52px;background:#111;color:white;display:flex;align-items:center;justify-content:center;font:12px sans-serif">ALTERU · OPEN IN APP</div>')` }))
  await page.route('https://chat.aiwaves.tech/aigram/api/gen-image', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ url: `data:image/svg+xml,${sceneSvg}` }) }))
  await page.goto(`http://127.0.0.1:4175/?cartridge=${cartridge}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  if (hideBanner) await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' })
  return page
}

const primary = await makePage(390, 844)
await primary.getByRole('button', { name: '翻开第一程' }).click()
await primary.waitForTimeout(300)
await primary.screenshot({ path: shot(`dock-core-v03-${pass}-platform-layout-390x844.png`) })
await primary.getByRole('button', { name: /检查外堤上的测量痕迹/ }).click()
await primary.waitForTimeout(700)
await primary.screenshot({ path: shot(`dock-stat-change-v03-${pass}-platform-layout-390x844.png`) })
await primary.getByRole('button', { name: '世界' }).click()
await primary.waitForTimeout(250)
await primary.screenshot({ path: shot(`dock-world-v03-${pass}-platform-layout-390x844.png`) })
await primary.close()

const narrow = await makePage(320, 568)
await narrow.getByRole('button', { name: '翻开第一程' }).click()
await narrow.waitForTimeout(300)
await narrow.screenshot({ path: shot(`dock-core-v03-${pass}-platform-layout-320x568.png`) })
await narrow.close()

const apartment = await makePage(320, 568, true, 'rooftop-apartment')
await apartment.getByRole('button', { name: '推开屋顶门' }).click()
await apartment.waitForTimeout(300)
await apartment.screenshot({ path: shot(`apartment-core-v03-${pass}-platform-layout-320x568.png`) })
await apartment.close()

const external = await makePage(390, 844, false)
await external.screenshot({ path: shot(`dock-entry-v03-${pass}-external-guest-390x844.png`) })
await external.close()

await browser.close()
