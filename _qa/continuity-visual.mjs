import fs from 'node:fs/promises'
import { chromium } from '/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'

const base = process.env.QA_BASE || 'http://127.0.0.1:4181/'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'zh-CN' })
await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }))
await page.route('https://qa.local/seventh-dock.webp', (route) => route.fulfill({ path: 'src/story/img/worlds/seventh-dock.webp', contentType: 'image/webp' }))
await page.route('https://chat.aiwaves.tech/aigram/api/gen-image', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ url: 'https://qa.local/seventh-dock.webp' }) }))
await page.goto(`${base}?story_mode=demo&lang=zh`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
await page.reload({ waitUntil: 'domcontentloaded' })
await page.getByRole('button', { name: /翻开第一程/ }).click()
await page.getByRole('button', { name: /检查外堤上的测量痕迹/ }).click()
await page.locator('.st-typing').waitFor({ state: 'hidden', timeout: 10_000 })
await page.locator('.st-decision-context').waitFor()
const context = await page.locator('.st-decision-context').innerText()
if (!context.includes('测量痕迹') && !context.includes('潮标')) throw new Error(`decision context did not preserve the visible result: ${context}`)
const buttons = await page.locator('.st-quick-replies button').allInnerTexts()
if (buttons.some((label) => /国王|快递员|玻璃王国/.test(label))) throw new Error(`ungrounded choice reached UI: ${buttons.join(' | ')}`)
await fs.mkdir('_qa/ui/continuity', { recursive: true })
await page.screenshot({ path: '_qa/ui/continuity/stateful-decision-context-platform-layout-390x844.png', fullPage: true })
console.log(JSON.stringify({ ok: true, context, choices: buttons }))
await browser.close()
