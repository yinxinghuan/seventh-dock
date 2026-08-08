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
    imageChoice: /Ask Mira why she recognizes this cipher/,
    worldImage: 'src/story/img/worlds/seventh-dock.webp',
    otherSave: 'rooftop-apartment-save',
  },
  'rooftop-apartment': {
    title: 'Rooftop Apartment',
    uuid: '929af687-289a-4712-b8fb-77a21fbe506f',
    port: 4182,
    enter: 'Open the rooftop door',
    choice: /Hear what each resident knows first/,
    imageChoice: /Have Jo organize the photo timestamps as evidence/,
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
let chatPayload = null
let failNextChat = false
let chatCalls = 0

async function createPage(hideBanner = true, storyMode = 'demo') {
  const page = await browser.newPage({ viewport: { width, height }, locale: 'en-US' })
  await page.addInitScript(() => {
    const prototype = window.AudioContext?.prototype
    if (!prototype) return
    const createOscillator = prototype.createOscillator
    prototype.createOscillator = function (...args) {
      window.__storyAudioOscillators = (window.__storyAudioOscillators || 0) + 1
      return createOscillator.apply(this, args)
    }
  })
  await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `document.body.insertAdjacentHTML('afterbegin','<div id="alteru-guest-banner" style="position:fixed;z-index:9999;inset:0 0 auto;height:52px;background:#111;color:white;display:flex;align-items:center;justify-content:center;font:12px sans-serif">ALTERU · OPEN IN APP</div>')`,
  }))
  await page.route(avatarUrl, (route) => route.fulfill({
    path: '/Users/yin/code/games/poster-wall/public/img/review-generated/avatar-tokyo.jpg',
    contentType: 'image/jpeg',
  }))
  await page.route(sceneUrl, (route) => route.fulfill({ path: path.resolve(config.worldImage), contentType: 'image/webp' }))
  await page.route('https://chat.aiwaves.tech/aigram/api/gen-image', async (route) => {
    imagePayload = route.request().postDataJSON()
    await new Promise((resolve) => setTimeout(resolve, 700))
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ url: sceneUrl }) })
  })
  await page.route('https://chat.aiwaves.tech/aigram/api/game-chat', (route) => {
    chatCalls += 1
    chatPayload = route.request().postDataJSON()
    if (failNextChat) {
      failNextChat = false
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'The saved world advances beyond the finite demo into a genuinely new situation.\n[widget: alert, value: 22]\n[choices: "Inspect the newly opened passage"|"Ask the party what changed"|"Secure the route before continuing"]' } }] }) })
  })
  const query = new URLSearchParams({ lang: 'en', avatar_url: avatarUrl, user_name: playerName })
  if (storyMode) query.set('story_mode', storyMode)
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
await page.locator('.st-message-image.is-generating').waitFor()
const audioButton = page.getByRole('button', { name: 'Mute sound' })
await audioButton.waitFor()
const audioBox = await audioButton.boundingBox()
await page.waitForFunction(() => (window.__storyAudioOscillators || 0) > 0)
const audioStarted = await page.evaluate(() => window.__storyAudioOscillators || 0)
if (!audioBox || audioBox.width < 44 || audioBox.height < 44 || audioStarted < 1) throw new Error(`procedural audio did not unlock with a 44px control: ${JSON.stringify({ audioBox, audioStarted })}`)
await audioButton.click()
const mutedState = await page.evaluate(() => ({ muted: localStorage.getItem('alteru_story_audio_muted'), pressed: document.querySelector('.st-audio-button')?.getAttribute('aria-pressed') }))
if (mutedState.muted !== '1' || mutedState.pressed !== 'false') throw new Error(`mute state was not persisted: ${JSON.stringify(mutedState)}`)
await page.getByRole('button', { name: 'Turn sound on' }).click()
const enabledState = await page.evaluate(() => ({ muted: localStorage.getItem('alteru_story_audio_muted'), pressed: document.querySelector('.st-audio-button')?.getAttribute('aria-pressed') }))
if (enabledState.muted !== '0' || enabledState.pressed !== 'true') throw new Error(`unmute state was not persisted: ${JSON.stringify(enabledState)}`)
const openingReading = await page.evaluate(() => {
  const feed = document.querySelector('.st-conversation').getBoundingClientRect()
  const prose = document.querySelector('.st-narration').getBoundingClientRect()
  const image = document.querySelector('.st-message-image').getBoundingClientRect()
  return { scrollTop: document.querySelector('.st-conversation').scrollTop, feedTop: feed.top, feedBottom: feed.bottom, proseTop: prose.top, proseBottom: prose.bottom, imageTop: image.top }
})
if (openingReading.scrollTop > 4 || openingReading.proseTop < openingReading.feedTop - 1 || openingReading.proseTop >= openingReading.feedBottom || openingReading.imageTop <= openingReading.proseTop) throw new Error(`opening text is not the reading anchor: ${JSON.stringify(openingReading)}`)
await page.screenshot({ path: shot('opening-reading') })
await page.waitForFunction(() => document.querySelector('.st-message-image.is-ready'))
if (imagePayload?.ref_url) throw new Error(`opening scene should not force the player avatar into an environmental image: ${JSON.stringify(imagePayload)}`)
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
const choiceWidths = await page.locator('.st-quick-replies button').evaluateAll((buttons) => buttons.map((button) => Math.round(button.getBoundingClientRect().width)))
if (new Set(choiceWidths).size < 2 || Math.max(...choiceWidths) > width * .83) throw new Error(`choice buttons are not content-sized: ${JSON.stringify(choiceWidths)}`)
const headerLayout = await page.evaluate(() => {
  const title = document.querySelector('.st-chat-header__identity span').getBoundingClientRect()
  const actions = document.querySelector('.st-chat-header__actions').getBoundingClientRect()
  return { titleRight: title.right, actionsLeft: actions.left, titleTop: title.top, titleBottom: title.bottom }
})
if (headerLayout.titleRight > headerLayout.actionsLeft + 1) throw new Error(`header title overlaps text controls: ${JSON.stringify(headerLayout)}`)
await page.getByRole('button', { name: config.choice }).click()
await page.locator('.st-message--player:not(.is-pending) .st-player-avatar img').last().waitFor()
await page.locator('.st-typing').waitFor({ state: 'hidden' })
await page.waitForTimeout(360)
const firstResponseReading = await page.evaluate(() => {
  const feed = document.querySelector('.st-conversation').getBoundingClientRect()
  const action = Array.from(document.querySelectorAll('[data-block-id^="action-"]')).at(-1)
  const response = action?.nextElementSibling
  const rect = response?.getBoundingClientRect()
  return { feedTop: feed.top, feedBottom: feed.bottom, responseTop: rect?.top, responseBottom: rect?.bottom, kind: response?.className }
})
if (firstResponseReading.responseTop == null || firstResponseReading.responseTop < firstResponseReading.feedTop - 2 || firstResponseReading.responseTop > firstResponseReading.feedTop + 96) throw new Error(`first response text is not the reading anchor: ${JSON.stringify(firstResponseReading)}`)
const saved = await page.evaluate(({ gameId, otherSave }) => ({
  mine: localStorage.getItem(`${gameId}-save`),
  other: localStorage.getItem(otherSave),
}), { gameId, otherSave: config.otherSave })
if (!saved.mine || saved.other) throw new Error(`save isolation failed: ${JSON.stringify(saved)}`)

await page.getByRole('button', { name: config.imageChoice }).click()
await page.locator('.st-message-image.is-generating').last().waitFor()
await page.locator('.st-typing').waitFor({ state: 'hidden' })
await page.waitForTimeout(360)
const generatedTurnReading = await page.evaluate(() => {
  const feed = document.querySelector('.st-conversation').getBoundingClientRect()
  const action = Array.from(document.querySelectorAll('[data-block-id^="action-"]')).at(-1)
  const response = action?.nextElementSibling
  const image = Array.from(document.querySelectorAll('.st-message-image')).at(-1)
  const responseRect = response?.getBoundingClientRect()
  const imageRect = image?.getBoundingClientRect()
  return { feedTop: feed.top, responseTop: responseRect?.top, responseBottom: responseRect?.bottom, imageTop: imageRect?.top, imageStatus: image?.className }
})
if (generatedTurnReading.responseTop == null || generatedTurnReading.imageTop == null || generatedTurnReading.responseTop < generatedTurnReading.feedTop - 2 || generatedTurnReading.responseTop > generatedTurnReading.feedTop + 64 || generatedTurnReading.imageTop <= generatedTurnReading.responseTop) throw new Error(`generated image displaced its response text: ${JSON.stringify(generatedTurnReading)}`)
await page.screenshot({ path: shot('generated-turn-reading') })
await page.locator('.st-message-image.is-ready').last().waitFor()

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
await page.evaluate((id) => {
  const legacy = localStorage.getItem(`${id}-save`)
  if (!legacy) throw new Error('missing standalone save before migration check')
  localStorage.setItem('stateful-story-template-save', legacy)
  localStorage.removeItem(`${id}-save`)
}, gameId)
await page.reload({ waitUntil: 'networkidle' })
await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' })
await page.getByRole('button', { name: 'Continue game' }).click()
await page.waitForFunction((id) => Boolean(localStorage.getItem(`${id}-save`)), gameId)
await page.close()

if (width === 390) {
  const external = await createPage(false)
  await external.locator('#alteru-guest-banner').waitFor()
  await external.screenshot({ path: fileURLToPath(new URL(`${gameId}-entry-${pass}-external-guest-390x844.png`, output)) })
  await external.close()
}

failNextChat = true
chatCalls = 0
chatPayload = null
const aiPage = await createPage(true, null)
await aiPage.getByRole('button', { name: config.enter }).click()
await aiPage.locator('.st-chat-header__identity i.is-live').waitFor()
await aiPage.getByRole('button', { name: config.choice }).click()
await aiPage.getByRole('button', { name: 'Retry this action' }).waitFor()
await aiPage.waitForTimeout(420)
const errorReading = await aiPage.evaluate(() => {
  const feed = document.querySelector('.st-conversation').getBoundingClientRect()
  const error = document.querySelector('[data-story-error]').getBoundingClientRect()
  return { feedTop: feed.top, errorTop: error.top, errorBottom: error.bottom, feedBottom: feed.bottom }
})
if (errorReading.errorTop < errorReading.feedTop - 2 || errorReading.errorTop > errorReading.feedTop + 96 || errorReading.errorBottom > errorReading.feedBottom) throw new Error(`AI error recovery is not visible: ${JSON.stringify(errorReading)}`)
await aiPage.screenshot({ path: shot('ai-error') })
const stateAfterFailure = await aiPage.evaluate((id) => {
  const saved = JSON.parse(localStorage.getItem(`${id}-save`) || '{}')
  return saved.worlds?.[id] ?? saved
}, gameId)
if (stateAfterFailure.scene !== 0 || stateAfterFailure.blocks.some((block) => block.text.includes('genuinely new situation'))) throw new Error('failed AI action mutated the saved world')
await aiPage.getByRole('button', { name: 'Retry this action' }).click()
await aiPage.getByText('The saved world advances beyond the finite demo into a genuinely new situation.', { exact: true }).waitFor()
await aiPage.waitForTimeout(420)
const aiReading = await aiPage.evaluate(() => {
  const feed = document.querySelector('.st-conversation').getBoundingClientRect()
  const marker = Array.from(document.querySelectorAll('.st-narration')).find((node) => node.textContent?.includes('genuinely new situation'))?.getBoundingClientRect()
  return { feedTop: feed.top, markerTop: marker?.top, markerBottom: marker?.bottom }
})
if (aiReading.markerTop == null || aiReading.markerTop < aiReading.feedTop - 2 || aiReading.markerTop > aiReading.feedTop + 96) throw new Error(`AI continuation is not the reading anchor: ${JSON.stringify(aiReading)}`)
if (chatCalls !== 2 || !chatPayload?.messages?.[0]?.content?.includes('Only these widget ids exist') || !chatPayload?.messages?.[1]?.content?.includes('WORLD_STATE_JSON')) throw new Error(`Aigram adapter contract failed: ${JSON.stringify({ chatCalls, chatPayload })}`)
await aiPage.screenshot({ path: shot('ai-continuation') })
await aiPage.close()

console.log(`${gameId} ok · procedural audio/mute · Aigram continuation/retry · opening/response anchors · adaptive choices · uuid · isolated save + shared-key migration · selective image identity · text size · ${width}x${height}`)
await browser.close()
