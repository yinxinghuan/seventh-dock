import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const output = new URL('./ui/', import.meta.url)
await fs.mkdir(output, { recursive: true })
const shot = (name) => fileURLToPath(new URL(name, output))
const browser = await chromium.launch({ headless: true })

const dockSvg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#244d54"/><stop offset="1" stop-color="#081214"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><circle cx="570" cy="145" r="83" fill="#d3a653" opacity=".64"/><path d="M0 455L195 330 320 430 470 270 800 470V600H0Z" fill="#0d2326"/><path d="M330 430L365 140H420L460 430Z" fill="#d7d8cb" opacity=".73"/><path d="M0 500Q180 455 340 510T800 490V600H0Z" fill="#071113" opacity=".8"/><path d="M78 180L720 400" stroke="#b6603c" stroke-width="6" opacity=".7"/></svg>`)
const apartmentSvg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><defs><linearGradient id="a" x2="0" y2="1"><stop stop-color="#6f8069"/><stop offset="1" stop-color="#211f1e"/></linearGradient></defs><rect width="800" height="600" fill="url(#a)"/><rect x="80" y="170" width="640" height="360" fill="#e5ddcf" opacity=".3"/><rect x="150" y="225" width="180" height="210" fill="#171718"/><rect x="470" y="225" width="180" height="210" fill="#d4a860" opacity=".65"/><circle cx="410" cy="405" r="70" fill="#a85f4d" opacity=".55"/><path d="M90 500Q250 450 370 500T710 475" stroke="#e5ddcf" stroke-width="7" fill="none" opacity=".65"/></svg>`)

async function makePage(width, height, hideBanner = true) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({ contentType: 'application/javascript', body: `document.body.insertAdjacentHTML('afterbegin','<div id="alteru-guest-banner" style="position:fixed;z-index:9999;inset:0 0 auto;height:52px;background:#111;color:white;display:flex;align-items:center;justify-content:center;font:12px sans-serif">ALTERU · OPEN IN APP</div>')` }))
  await page.route('https://chat.aiwaves.tech/aigram/api/gen-image', (route) => {
    const prompt = String(route.request().postData() ?? '')
    const imageUrl = `data:image/svg+xml,${prompt.includes('apartment') ? apartmentSvg : dockSvg}`
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ url: imageUrl }) })
  })
  page.__hideBanner = hideBanner
  return page
}

async function fresh(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  if (page.__hideBanner) await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' })
}

const dock = await makePage(390, 844)
await fresh(dock, 'http://127.0.0.1:4175/?cartridge=seventh-dock')
await dock.screenshot({ path: shot('dock-entry-dialogue-final-platform-layout-390x844.png'), fullPage: false })
await dock.getByRole('button', { name: '翻开第一程' }).click()
await dock.waitForTimeout(500)
await dock.screenshot({ path: shot('dock-core-dialogue-final-platform-layout-390x844.png'), fullPage: false })
await dock.getByRole('button', { name: /检查外堤上的测量痕迹/ }).click()
await dock.waitForTimeout(1000)
await dock.screenshot({ path: shot('dock-check-dialogue-final-platform-layout-390x844.png'), fullPage: false })
await dock.getByRole('button', { name: /要求弥拉解释她认得这种暗号的原因/ }).click()
await dock.waitForTimeout(1600)
await dock.screenshot({ path: shot('dock-inline-image-dialogue-final-platform-layout-390x844.png'), fullPage: false })
await dock.getByRole('button', { name: '世界' }).click()
await dock.waitForTimeout(180)
await dock.screenshot({ path: shot('dock-world-dialogue-final-platform-layout-390x844.png'), fullPage: false })
await dock.close()

const apartment = await makePage(320, 568)
await fresh(apartment, 'http://127.0.0.1:4175/?cartridge=rooftop-apartment')
await apartment.screenshot({ path: shot('apartment-entry-dialogue-final-platform-layout-320x568.png'), fullPage: false })
await apartment.getByRole('button', { name: '推开屋顶门' }).click()
await apartment.waitForTimeout(500)
await apartment.screenshot({ path: shot('apartment-core-dialogue-final-platform-layout-320x568.png'), fullPage: false })
await apartment.close()

const external = await makePage(390, 844, false)
await fresh(external, 'http://127.0.0.1:4175/?cartridge=seventh-dock')
await external.screenshot({ path: shot('dock-entry-external-guest-390x844.png'), fullPage: false })
await external.close()

await browser.close()
