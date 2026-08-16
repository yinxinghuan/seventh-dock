import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { installMediaMock } from './media-mock.mjs'

const [base, enterLabel, tag] = process.argv.slice(2)
if (!base || !enterLabel || !tag) throw new Error('usage: node _qa/release-visual.mjs <base> <enter-label> <tag>')
mkdirSync('_qa/ui', { recursive: true })
const browser = await chromium.launch({ headless: true })

async function open(viewport, external = false) {
  const page = await browser.newPage({ viewport, locale: 'zh-CN' })
  await installMediaMock(page)
  await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: external ? "document.addEventListener('DOMContentLoaded',()=>{const b=document.createElement('div');b.id='alteru-guest-banner';b.textContent='AlterU';Object.assign(b.style,{position:'fixed',top:'0',left:'0',right:'0',height:'48px',zIndex:'9999',background:'#111',color:'#fff'});document.body.appendChild(b)})" : '',
  }))
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.evaluate(() => window.alteruLocalStorage?.clear())
  await page.reload({ waitUntil: 'networkidle' })
  return page
}

for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
  const page = await open(viewport)
  await page.getByRole('button', { name: enterLabel, exact: true }).click()
  await page.locator('.st-quick-replies button').first().waitFor({ state: 'visible' })
  const opening = await page.evaluate(() => ({ inner: window.innerWidth, scroll: document.documentElement.scrollWidth }))
  if (opening.scroll > opening.inner + 1) throw new Error(`opening horizontal overflow: ${opening.scroll} > ${opening.inner}`)
  await page.screenshot({ path: `_qa/ui/${tag}-v10-platform-layout-opening-${viewport.width}x${viewport.height}.png`, fullPage: false })
  await page.locator('.st-quick-replies button').first().click()
  await page.locator('.st-quick-replies button').first().waitFor({ state: 'visible' })
  if (!(await page.locator('.st-composer input').isVisible())) throw new Error('free input is not visible after the local opening turn')
  const result = await page.evaluate(() => ({ inner: window.innerWidth, scroll: document.documentElement.scrollWidth }))
  if (result.scroll > result.inner + 1) throw new Error(`result horizontal overflow: ${result.scroll} > ${result.inner}`)
  await page.screenshot({ path: `_qa/ui/${tag}-v10-platform-layout-result-${viewport.width}x${viewport.height}.png`, fullPage: false })
  await page.close()
}

const external = await open({ width: 390, height: 844 }, true)
await external.getByRole('button', { name: enterLabel, exact: true }).click()
await external.locator('#alteru-guest-banner').waitFor({ state: 'visible' })
await external.screenshot({ path: `_qa/ui/${tag}-v10-external-guest-390x844.png`, fullPage: false })
await external.close()
await browser.close()
console.log(JSON.stringify({ ok: true, checks: ['platform-390', 'platform-320', 'opening-local-turn', 'free-input', 'no-horizontal-overflow', 'external-guest'] }))
