import { chromium } from '/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const gameId = path.basename(process.cwd())
const configs = {
  'seventh-dock': {
    title: 'Seventh Dock',
    uuid: '80a488ee-f6c9-4de5-a7a6-b2a9b9e88401',
    port: 4181,
    enter: 'Open the first passage',
    choice: /Inspect the survey marks/,
    worldImage: 'src/story/img/worlds/seventh-dock.webp',
    otherSave: 'rooftop-apartment-save',
  },
  'rooftop-apartment': {
    title: 'Rooftop Apartment',
    uuid: '929af687-289a-4712-b8fb-77a21fbe506f',
    port: 4182,
    enter: 'Open the rooftop door',
    choice: /Hear what each resident knows first/,
    worldImage: 'src/story/img/worlds/rooftop-apartment.webp',
    otherSave: 'seventh-dock-save',
  },
}
const config = configs[gameId]
if (!config) throw new Error(`unknown project: ${gameId}`)

const width = Number(process.argv[2] || 390)
const height = width <= 320 ? 568 : 844
const pass = process.argv[3] || 'final'
const avatarUrl = 'https://cdn.example.com/player-avatar.jpg'
const sceneUrl = 'https://cdn.example.com/generated-scene.webp'
const playerName = 'Alexandria-Montgomery-Fieldnotes-From-The-Northern-Archive'
const output = new URL('./ui/', import.meta.url)
await fs.mkdir(output, { recursive: true })
const shot = (state) => fileURLToPath(new URL(`${gameId}-${state}-${pass}-platform-layout-${width}x${height}.png`, output))
const browser = await chromium.launch({ headless: true })
let imagePayload = null

async function createPage(hideBanner = true) {
  const page = await browser.newPage({ viewport: { width, height }, locale: 'en-US' })
  await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `document.body.insertAdjacentHTML('afterbegin','<div id="alteru-guest-banner" style="position:fixed;z-index:9999;inset:0 0 auto;height:52px;background:#111;color:white;display:flex;align-items:center;justify-content:center;font:12px sans-serif">ALTERU · OPEN IN APP</div>')`,
  }))
  await page.route(avatarUrl, (route) => route.fulfill({
    path: '/Users/yin/code/games/poster-wall/public/img/review-generated/avatar-tokyo.jpg',
    contentType: 'image/jpeg',
  }))
  await page.route(sceneUrl, (route) => route.fulfill({ path: path.resolve(config.worldImage), contentType: 'image/webp' }))
  await page.route('https://chat.aiwaves.tech/aigram/api/gen-image', (route) => {
    imagePayload = route.request().postDataJSON()
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ url: sceneUrl }) })
  })
  const query = new URLSearchParams({ lang: 'en', avatar_url: avatarUrl, user_name: playerName })
  await page.goto(`http://127.0.0.1:${config.port}/?${query}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  if (hideBanner) await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' })
  return page
}

const page = await createPage(true)
if (await page.locator('.st-entry__cartridges').count()) throw new Error('cartridge selector still exists')
await page.getByRole('heading', { name: config.title, exact: true }).waitFor()
const runtimeUuid = await page.evaluate(() => window.__GAME_UUID__)
if (runtimeUuid !== config.uuid) throw new Error(`UUID mismatch: ${runtimeUuid}`)
await page.screenshot({ path: shot('entry') })

await page.getByRole('button', { name: config.enter }).click()
await page.waitForFunction(() => document.querySelector('.st-message-image.is-ready'))
if (imagePayload?.ref_url !== avatarUrl) throw new Error(`avatar ref_url missing: ${JSON.stringify(imagePayload)}`)
await page.locator('.st-text-size summary').click()
await page.screenshot({ path: shot('text-size') })
await page.getByRole('button', { name: 'Large', exact: true }).click()
const textSize = await page.evaluate(() => ({
  mode: document.querySelector('.st-shell')?.getAttribute('data-text-size'),
  prose: getComputedStyle(document.querySelector('.st-narration p')).fontSize,
  saved: localStorage.getItem('alteru_story_text_size'),
}))
if (textSize.mode !== 'large' || textSize.prose !== '19px' || textSize.saved !== 'large') throw new Error(`text size setting failed: ${JSON.stringify(textSize)}`)
await page.reload({ waitUntil: 'networkidle' })
await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' })
await page.locator('.st-shell[data-text-size="large"]').waitFor()
const headerLayout = await page.evaluate(() => {
  const title = document.querySelector('.st-chat-header__identity span').getBoundingClientRect()
  const actions = document.querySelector('.st-chat-header__actions').getBoundingClientRect()
  return { titleRight: title.right, actionsLeft: actions.left, titleTop: title.top, titleBottom: title.bottom }
})
if (headerLayout.titleRight > headerLayout.actionsLeft + 1) throw new Error(`header title overlaps text controls: ${JSON.stringify(headerLayout)}`)
await page.getByRole('button', { name: config.choice }).click()
await page.locator('.st-message--player:not(.is-pending) .st-player-avatar img').last().waitFor()
await page.locator('.st-typing').waitFor({ state: 'hidden' })
const saved = await page.evaluate(({ gameId, otherSave }) => ({
  mine: localStorage.getItem(`${gameId}-save`),
  other: localStorage.getItem(otherSave),
}), { gameId, otherSave: config.otherSave })
if (!saved.mine || saved.other) throw new Error(`save isolation failed: ${JSON.stringify(saved)}`)

const avatarBox = await page.locator('.st-message--player:not(.is-pending) .st-player-avatar img').last().boundingBox()
const layout = await page.evaluate(() => ({
  viewport: innerWidth,
  documentWidth: document.documentElement.scrollWidth,
  selectorCount: document.querySelectorAll('.st-entry__cartridges').length,
}))
if (!avatarBox || avatarBox.x < 0 || avatarBox.x + avatarBox.width > layout.viewport) throw new Error(`avatar outside viewport: ${JSON.stringify({ avatarBox, layout })}`)
if (layout.documentWidth > layout.viewport + 1) throw new Error(`horizontal overflow: ${JSON.stringify(layout)}`)
await page.locator('.st-message--player:not(.is-pending)').last().scrollIntoViewIfNeeded()
await page.screenshot({ path: shot('core') })

await page.getByRole('button', { name: 'World' }).click()
await page.waitForTimeout(280)
await page.locator('.st-roster__player').getByText(playerName, { exact: true }).waitFor()
await page.screenshot({ path: shot('world') })
await page.close()

if (width === 390) {
  const external = await createPage(false)
  await external.locator('#alteru-guest-banner').waitFor()
  await external.screenshot({ path: fileURLToPath(new URL(`${gameId}-entry-${pass}-external-guest-390x844.png`, output)) })
  await external.close()
}

console.log(`${gameId} ok · single cartridge · uuid · isolated save · avatar · gen-image ref · text size · ${width}x${height}`)
await browser.close()
