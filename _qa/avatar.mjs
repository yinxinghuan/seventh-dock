import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const avatarUrl = 'https://cdn.example.com/player-avatar.jpg'
const playerName = 'Alexandria-Montgomery-Fieldnotes-From-The-Northern-Archive'
const pass = process.argv[2] || 'pass1'
const width = Number(process.argv[3] || 390)
const height = width <= 320 ? 568 : 844
const output = new URL('./ui/', import.meta.url)
await fs.mkdir(output, { recursive: true })
const shot = (name) => fileURLToPath(new URL(name, output))
const avatarFixture = fileURLToPath(new URL('../public/alteru-default-avatar.jpg', import.meta.url))
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width, height }, locale: 'en-US' })
let imagePayloads = []

await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }))
await page.route(avatarUrl, (route) => route.fulfill({ path: avatarFixture, contentType: 'image/jpeg' }))
await page.route('https://game.aiwaves.tech/alteru-media/api/v1/images/generations', async (route) => {
  const body = route.request().postDataJSON()
  imagePayloads.push(body)
  await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
    task_id: `qa-avatar-task-${imagePayloads.length}`,
    request_id: body.request_id,
    status: 'succeeded',
    media: { type: 'image', url: avatarUrl, width: 768, height: 576, format: 'png' },
  }) })
})

const query = new URLSearchParams({ cartridge: 'seventh-dock', lang: 'en', story_mode: 'demo', avatar_url: avatarUrl, user_name: playerName })
await page.goto(`http://127.0.0.1:4175/?${query}`, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Open the first passage' }).click()
await page.waitForFunction(() => document.querySelector('.st-message-image.is-ready'))

if (imagePayloads.some((payload) => payload?.reference_urls?.length)) throw new Error(`environment opening should not use a portrait reference: ${JSON.stringify(imagePayloads)}`)
await page.evaluate(() => {
  const key = 'stateful-story-template-save'
  const archive = JSON.parse(localStorage.getItem(key) || '{}')
  const world = archive.worlds['seventh-dock']
  world.scene = 1
  world.blocks.push({
    id: 'image-qa-avatar', kind: 'image', text: 'Outer quay',
    data: {
      prompt: 'medium shot of the player protagonist gripping a copper rail while speaking to a harbor pilot, cinematic story frame',
      promptVersion: 5, playerVisible: 'true', status: 'queued', source: 'director', reason: 'qa-character-shot',
    },
  })
  localStorage.setItem(key, JSON.stringify(archive))
})
imagePayloads = []
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Continue game' }).click()
await page.waitForFunction(() => {
  const archive = JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}')
  return archive.worlds?.['seventh-dock']?.blocks?.find((block) => block.id === 'image-qa-avatar')?.data?.status === 'ready'
})
const characterPayload = imagePayloads.find((payload) => payload?.reference_urls?.includes(avatarUrl))
if (!characterPayload) throw new Error(`character-forward avatar reference missing: ${JSON.stringify(imagePayloads)}`)
if (!String(characterPayload.prompt || '').includes('HARD FULL-VISUAL-IDENTITY CAST MAP')) throw new Error('identity prompt was not attached to the character-forward shot')

await page.locator('.st-text-size summary').click()
await page.screenshot({ path: shot(`dock-text-size-v06-${pass}-platform-layout-${width}x${height}.png`) })
await page.getByRole('button', { name: 'Large', exact: true }).click()
const textSize = await page.evaluate(() => ({
  mode: document.querySelector('.st-shell')?.getAttribute('data-text-size'),
  prose: getComputedStyle(document.querySelector('.st-narration p')).fontSize,
  saved: localStorage.getItem('alteru_story_text_size'),
}))
if (textSize.mode !== 'large' || textSize.prose !== '19px' || textSize.saved !== 'large') throw new Error(`text size setting failed: ${JSON.stringify(textSize)}`)
await page.reload({ waitUntil: 'networkidle' })
await page.locator('.st-shell[data-text-size="large"]').waitFor()
await page.getByRole('button', { name: 'Continue game' }).click()

await page.getByRole('button', { name: /Inspect the survey marks/ }).click()
await page.locator('.st-message--player p').filter({ hasText: 'Inspect the survey marks on the outer quay' }).waitFor()
await page.locator('.st-typing').waitFor({ state: 'hidden' })
const actionAvatar = page.locator('.st-message--player:not(.is-pending) .st-player-avatar img').last()
if (await actionAvatar.getAttribute('src') !== avatarUrl) throw new Error('player action did not render the debug avatar')
const avatarBox = await actionAvatar.boundingBox()
const layoutMetrics = await page.evaluate(() => ({ viewport: innerWidth, shell: document.querySelector('.st-shell')?.getBoundingClientRect().toJSON(), feed: document.querySelector('.st-conversation')?.getBoundingClientRect().toJSON() }))
if (!avatarBox || avatarBox.x < 0 || avatarBox.x + avatarBox.width > layoutMetrics.viewport) throw new Error(`player avatar is outside the viewport: ${JSON.stringify({ avatarBox, layoutMetrics })}`)
await actionAvatar.evaluate((node) => {
  const feed = node.closest('.st-conversation')
  if (!(feed instanceof HTMLElement)) return
  feed.scrollLeft = 0
  feed.scrollTop += node.getBoundingClientRect().top - feed.getBoundingClientRect().top - 108
})
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(120)
const widthMetrics = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }))
if (widthMetrics.document > widthMetrics.viewport + 1) throw new Error(`horizontal overflow: ${JSON.stringify(widthMetrics)}`)
await page.screenshot({ path: shot(`dock-player-avatar-action-v05-${pass}-platform-layout-${width}x${height}.png`) })

await page.locator('.st-world-button').click()
await page.waitForTimeout(280)
const playerRecord = page.locator('.st-roster__player')
await playerRecord.getByText(playerName, { exact: true }).waitFor()
if (await playerRecord.locator('img').getAttribute('src') !== avatarUrl) throw new Error('world drawer did not render the player avatar')

await page.screenshot({ path: shot(`dock-player-avatar-world-v05-${pass}-platform-layout-${width}x${height}.png`) })
await page.close()

const fallbackPage = await browser.newPage({ viewport: { width: 320, height: 568 }, locale: 'en-US' })
await fallbackPage.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }))
await fallbackPage.route('https://game.aiwaves.tech/alteru-media/api/v1/images/generations', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
await fallbackPage.goto('http://127.0.0.1:4175/?cartridge=seventh-dock&lang=en&story_mode=demo', { waitUntil: 'networkidle' })
await fallbackPage.evaluate(() => localStorage.clear())
await fallbackPage.reload({ waitUntil: 'networkidle' })
await fallbackPage.getByRole('button', { name: 'Open the first passage' }).click()
await fallbackPage.locator('.st-world-button').click()
const fallbackSrc = await fallbackPage.locator('.st-roster__player img').getAttribute('src')
if (!fallbackSrc?.endsWith('/alteru-default-avatar.jpg')) throw new Error(`default avatar fallback missing: ${fallbackSrc}`)
const fallbackResponse = await fallbackPage.request.get(fallbackSrc)
if (!fallbackResponse.ok()) throw new Error(`default avatar asset unavailable: ${fallbackResponse.status()}`)

console.log('avatar ok · action badge · protagonist record · selective media reference · default fallback · text size')
await browser.close()
