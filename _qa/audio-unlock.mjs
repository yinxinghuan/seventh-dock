import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'zh-CN' })
await context.addInitScript(() => {
  const NativeAudioContext = window.AudioContext || window.webkitAudioContext
  window.__audioQa = { created: 0, resumes: 0, oscillatorStarts: 0, bufferStarts: 0 }
  if (!NativeAudioContext) return
  class TrackedAudioContext extends NativeAudioContext {
    constructor(...args) {
      super(...args)
      window.__audioQa.created += 1
    }
    resume() {
      window.__audioQa.resumes += 1
      return super.resume()
    }
    createOscillator() {
      const node = super.createOscillator()
      const start = node.start.bind(node)
      node.start = (...args) => {
        window.__audioQa.oscillatorStarts += 1
        return start(...args)
      }
      return node
    }
    createBufferSource() {
      const node = super.createBufferSource()
      const start = node.start.bind(node)
      node.start = (...args) => {
        window.__audioQa.bufferStarts += 1
        return start(...args)
      }
      return node
    }
  }
  Object.defineProperty(window, 'AudioContext', { configurable: true, writable: true, value: TrackedAudioContext })
  Object.defineProperty(window, 'webkitAudioContext', { configurable: true, writable: true, value: TrackedAudioContext })
})

const page = await context.newPage()
await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }))
const url = process.env.STORY_AUDIO_URL || 'http://127.0.0.1:4175/?cartridge=the-wild-road&story_mode=demo&lang=zh'
const enterLabel = process.env.STORY_AUDIO_ENTER || '走向十字路口'
await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })

let state = await page.evaluate(() => window.__audioQa)
if (state.created !== 0) throw new Error(`AudioContext was created before a user gesture: ${JSON.stringify(state)}`)

await page.getByRole('button', { name: enterLabel }).click()
await page.getByRole('button', { name: '静音' }).waitFor({ state: 'visible' })
state = await page.evaluate(() => window.__audioQa)
if (state.created !== 1 || state.oscillatorStarts < 1 || state.bufferStarts < 1) throw new Error(`first gesture did not start audible graph: ${JSON.stringify(state)}`)

await page.evaluate(() => {
  localStorage.clear()
  localStorage.setItem('alteru_story_audio_muted', '1')
})
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('button', { name: enterLabel }).click()
state = await page.evaluate(() => window.__audioQa)
if (state.created !== 0) throw new Error(`muted entry created AudioContext unexpectedly: ${JSON.stringify(state)}`)

const enable = page.getByRole('button', { name: '开启声音' })
await enable.click()
await page.getByRole('button', { name: '静音' }).waitFor({ state: 'visible' })
state = await page.evaluate(() => window.__audioQa)
if (state.created !== 1 || state.oscillatorStarts < 1) throw new Error(`explicit enable did not retry audio: ${JSON.stringify(state)}`)

console.log(`audio ok · gesture-only context · audible graph · muted retry · ${JSON.stringify(state)}`)
await browser.close()
