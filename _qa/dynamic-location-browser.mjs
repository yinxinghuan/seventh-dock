import { chromium } from 'playwright'
import { installMediaMock } from './media-mock.mjs'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }))
await installMediaMock(page)

const base = 'http://127.0.0.1:4175/?cartridge=seventh-dock&lang=en&story_mode=demo'
await page.goto(base, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('button', { name: /Open|Begin|Enter|Step/i }).first().click()
await page.waitForTimeout(150)

await page.evaluate(() => {
  const key = 'stateful-story-template-save'
  const archive = JSON.parse(localStorage.getItem(key) || '{}')
  const world = archive.worlds['seventh-dock']
  world.map.forEach((node) => { node.current = node.label === world.location })
  world.map.push({ id: 'dynamic-browser-vale', label: 'Mossbell Vale', routeHints: ['Glow Vale', 'Old Mill Gate'], visited: true, current: false })
  world.choices = [{ id: 'legacy-unbound-route', label: 'Travel to Glow Vale' }]
  localStorage.setItem(key, JSON.stringify(archive))
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(200)
const rebound = await page.evaluate(() => JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}').worlds['seventh-dock'])
if (rebound.choices[0]?.targetLocationId !== 'dynamic-browser-vale') throw new Error('legacy displayed route was not rebound to the dynamic stable id')

await page.evaluate(() => {
  const key = 'stateful-story-template-save'
  const archive = JSON.parse(localStorage.getItem(key) || '{}')
  const world = archive.worlds['seventh-dock']
  world.location = 'Mossbell Vale'
  world.sceneLocation = 'Mossbell Vale Old Tower Foot'
  world.map.forEach((node) => {
    node.current = node.id === 'dynamic-browser-vale'
    if (node.id === 'dynamic-browser-vale') delete node.routeHints
  })
  world.blocks.push({ id: 'dynamic-visible-history', kind: 'narration', text: 'You arrive at Mossbell Vale Old Tower Foot.' })
  localStorage.setItem(key, JSON.stringify(archive))
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(200)
const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}').worlds['seventh-dock'])
const node = migrated.map.find((entry) => entry.id === 'dynamic-browser-vale')
if (!node.routeHints?.includes('Mossbell Vale')) throw new Error('legacy dynamic node did not recover its canonical name')
if (!node.routeHints?.includes('Mossbell Vale Old Tower Foot')) throw new Error('visible legacy sublocation was not recovered')

await browser.close()
console.log('dynamic location browser ok · displayed target rebound · legacy visible sublocation migrated · 390×844')
