import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { installMediaMock } from './media-mock.mjs'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'zh-CN' })

await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }))
await installMediaMock(page)

const url = 'http://127.0.0.1:4175/?cartridge=the-wild-road&story_mode=demo&lang=zh'
await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('button', { name: '走向十字路口' }).click()
await page.getByRole('button', { name: /循着鹿蹄印进入西面的树林/ }).click()
await page.waitForFunction(() => {
  const world = JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}').worlds?.['the-wild-road']
  return world?.scene >= 1
}, undefined, { timeout: 30000 })

await page.evaluate(() => {
  const key = 'stateful-story-template-save'
  const archive = JSON.parse(localStorage.getItem(key) || '{}')
  archive.worlds['seventh-dock'] = { cartridgeId: 'seventh-dock', sentinel: 'preserve-other-world' }
  localStorage.setItem(key, JSON.stringify(archive))
})
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('button', { name: '继续游戏' }).click()
await page.evaluate(() => {
  const next = new URL(location.href)
  next.searchParams.set('chat_id', 'qa-bound-chat')
  history.replaceState({}, '', next)
})

await page.locator('.st-world-button').click()
await page.getByRole('button', { name: '旅记' }).click()
await page.getByRole('button', { name: /系统.*第 2 段/ }).click()
await page.getByRole('button', { name: '从头开始' }).click()
await page.getByText(/当前存档会被覆盖/).waitFor({ state: 'visible' })

const beforeConfirm = await page.evaluate(() => JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}'))
if (beforeConfirm.worlds['the-wild-road']?.scene !== 1) throw new Error('first restart tap changed the save before confirmation')

mkdirSync('_qa/ui', { recursive: true })
await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' })
await page.screenshot({ path: '_qa/ui/platform-layout-restart-confirm-390x844.png' })
await page.setViewportSize({ width: 320, height: 568 })
await page.screenshot({ path: '_qa/ui/platform-layout-restart-confirm-320x568.png' })
await page.locator('.st-drawer > section').evaluate((node) => { node.scrollTop = node.scrollHeight })
await page.screenshot({ path: '_qa/ui/platform-layout-restart-confirm-actions-320x568.png' })
await page.setViewportSize({ width: 390, height: 844 })

await page.getByRole('button', { name: '保留当前旅程' }).click()
if (await page.getByText(/当前存档会被覆盖/).count()) throw new Error('cancel did not close restart confirmation')
await page.getByRole('button', { name: '从头开始' }).click()
await page.getByRole('button', { name: '确认从头开始' }).click()
await page.getByRole('button', { name: '走向十字路口' }).waitFor({ state: 'visible' })

const after = await page.evaluate(() => JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}'))
const resetWorld = after.worlds['the-wild-road']
if (resetWorld?.scene !== 0 || resetWorld?.entered !== false) throw new Error('current world did not return to a fresh opening save')
if (after.worlds['seventh-dock']?.sentinel !== 'preserve-other-world') throw new Error('restart erased another cartridge world')
if (new URL(page.url()).searchParams.has('chat_id')) throw new Error('restart did not remove the remote chat binding')

console.log('restart world ok · two-step confirm · cancel safe · current world reset · other world preserved · remote unbound')
await browser.close()
