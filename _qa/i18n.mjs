import { chromium } from 'playwright'
import { installMediaMock } from './media-mock.mjs'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'en-US' })
await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }))
await installMediaMock(page, { fail: true })

const base = 'http://127.0.0.1:4175/'
await page.goto(`${base}?cartridge=seventh-dock&lang=en&story_mode=demo`, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('heading', { name: 'Seventh Dock' }).waitFor()
await page.getByRole('button', { name: 'Open the first passage' }).click()

const input = page.getByRole('textbox', { name: 'Custom action' })
await input.fill('我们先检查外堤上的痕迹')
await input.press('Enter')
await page.locator('.st-world-button').waitFor()
await page.waitForFunction(() => JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}')?.worlds?.['seventh-dock']?.locale === 'zh')
if (await page.evaluate(() => JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}').worlds['seventh-dock'].location) !== '第七码头 · 外堤') throw new Error('Known location did not localize to Chinese')

const chineseActionCount = await page.getByText('我们先检查外堤上的痕迹', { exact: true }).count()
if (!chineseActionCount) throw new Error('Chinese action was not preserved in history')

const zhInput = page.getByRole('textbox', { name: '自定义行动' })
await zhInput.fill('Ask Mira about the cipher')
await zhInput.press('Enter')
await page.locator('.st-world-button').waitFor()
await page.waitForFunction(() => JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}')?.worlds?.['seventh-dock']?.locale === 'en')
if (await page.evaluate(() => JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}').worlds['seventh-dock'].location) !== 'Wreck Alley') throw new Error('New English scene location was not committed')
if (!await page.getByText('Ask Mira about the cipher', { exact: true }).count()) throw new Error('English action was not preserved in history')

await page.goto(`${base}?cartridge=seventh-dock&story_mode=demo`, { waitUntil: 'networkidle' })
await page.locator('.st-world-button').waitFor()

console.log('i18n ok · system=en · action_switch=en→zh→en · restored=en')
await browser.close()
