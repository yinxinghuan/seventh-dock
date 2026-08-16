import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { installMediaMock } from './media-mock.mjs'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'zh-CN' })
const requests = []

await page.route('https://images.aiwaves.tech/alteru/guest-shell.js', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }))
await installMediaMock(page)
await page.route('https://chat.aiwaves.tech/aigram/api/game-chat', async (route) => {
  requests.push(route.request().postDataJSON())
  const content = requests.length === 1
    ? `你在林缘找到了三条新鲜痕迹：蓝色烟迹深入树林，灰瓦村翻倒的货车旁留有车辙，旧塔的铜光则从高处闪过。这里可以暂时记作一个阶段节点，但道路并没有关闭。\n你接下来可以：\n1. 沿着蓝色烟迹深入树林\n2. 返回灰瓦村询问翻倒的货车\n3. 留在高处观察旧塔的铜光\n[session_end: reason="林缘痕迹已记录"]`
    : requests.length === 2
      ? `你选择的行动接上了林缘的发现。眼下三项行动都已经由现场证据确认：继续追踪烟迹、检查附近营火、记下位置后返回村庄。\n[choices: "继续追踪烟迹"|"检查附近营火"|"记下位置后返回村庄"]`
      : '你沿着烟迹抵达林间空地，发现火堆刚刚熄灭，湿泥里留下两个人的脚印。'
  await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content } }] }) })
})

const base = 'http://127.0.0.1:4175/?cartridge=the-wild-road&lang=zh'
await page.goto(base, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('button', { name: '走向十字路口' }).click()
await page.getByRole('button', { name: '循着鹿蹄印进入西面的树林' }).click()

const recovered = ['沿着蓝色烟迹深入树林', '返回灰瓦村询问翻倒的货车', '留在高处观察旧塔的铜光']
for (const label of recovered) await page.getByRole('button', { name: new RegExp(label) }).waitFor({ state: 'visible', timeout: 10000 })
if (await page.getByRole('button', { name: /继续这段旅程/ }).count()) throw new Error('generic continue replaced real prose choices')
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}').worlds?.['the-wild-road'])
if (!saved.sessionEnded || saved.choices.length !== 3) throw new Error('checkpoint did not preserve recovered choices')
if (saved.blocks.some((block) => /^\d+[.、]/.test(block.text))) throw new Error('choice list was duplicated as narration')

mkdirSync('_qa/ui', { recursive: true })
await page.screenshot({ path: '_qa/ui/platform-layout-choice-recovery-390x844.png' })
await page.getByRole('button', { name: /返回灰瓦村询问翻倒的货车/ }).click()
await page.getByRole('button', { name: /继续追踪烟迹/ }).waitFor({ state: 'visible', timeout: 10000 })
if (requests.length !== 2) throw new Error(`choice did not advance the AI turn: requests=${requests.length}`)
const submitted = String(requests[1].messages?.[1]?.content ?? '')
if (!submitted.includes('PLAYER_ACTION:\n返回灰瓦村询问翻倒的货车')) throw new Error('recovered button did not submit its exact action')

await page.getByRole('button', { name: /继续追踪烟迹/ }).click()
await page.waitForFunction(() => {
  const world = JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}').worlds?.['the-wild-road']
  return world?.scene >= 3
}, undefined, { timeout: 20000 })
const safetyChoices = await page.locator('.st-quick-replies button').allTextContents()
if (safetyChoices.length !== 2) throw new Error(`replyless commit did not keep the two remaining grounded siblings: ${JSON.stringify(safetyChoices)}`)
if (safetyChoices.some((label) => label.includes('继续这段旅程'))) throw new Error('choice safety net fell back to generic continue')
if (safetyChoices.some((label) => label.includes('继续追踪烟迹'))) throw new Error(`the just-completed action was re-offered: ${JSON.stringify(safetyChoices)}`)
const safetySaved = await page.evaluate(() => JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}').worlds?.['the-wild-road'])
if (safetySaved.choices.length !== 2) throw new Error('replyless sibling choices were not persisted')
if (safetySaved.objective === '继续追踪烟迹') throw new Error('attempted action overwrote the long-term objective')
if (safetySaved.blocks.some((block) => block.id.startsWith('consistency-recovery-'))) throw new Error('reply-only failure created a synthetic consistency recovery')

await page.evaluate(() => {
  const key = 'stateful-story-template-save'
  const archive = JSON.parse(localStorage.getItem(key) || '{}')
  const world = archive.worlds['the-wild-road']
  world.sessionEnded = false
  world.choices = [{ id: 'legacy-continue', label: '继续这段旅程' }]
  world.blocks.push(
    { id: 'action-legacy-choice', kind: 'event', text: '继续这段旅程' },
    { id: 'legacy-choice-cue', kind: 'narration', text: '你现在可以：' },
    { id: 'legacy-choice-1', kind: 'narration', text: '1. 检查溪边遗留的行李' },
    { id: 'legacy-choice-2', kind: 'narration', text: '2. 沿脚印前往北面的桥' },
    { id: 'legacy-choice-3', kind: 'narration', text: '3. 返回村庄寻找向导' },
  )
  localStorage.setItem(key, JSON.stringify(archive))
})
await page.reload({ waitUntil: 'networkidle' })
const resumeEntry = page.getByRole('button', { name: '继续这段旅程' })
if (await resumeEntry.count()) await resumeEntry.click()
for (const label of ['检查溪边遗留的行李', '沿脚印前往北面的桥', '返回村庄寻找向导']) {
  await page.getByRole('button', { name: new RegExp(label) }).waitFor({ state: 'visible', timeout: 10000 })
}
if (await page.getByRole('button', { name: /继续这段旅程/ }).count()) throw new Error('legacy generic continue was not repaired on load')
const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}').worlds?.['the-wild-road'])
if (migrated.blocks.some((block) => /^\d+[.、]/.test(block.text))) throw new Error('legacy choice lines were not removed after recovery')

await page.evaluate(() => {
  const key = 'stateful-story-template-save'
  const archive = JSON.parse(localStorage.getItem(key) || '{}')
  const world = archive.worlds['the-wild-road']
  world.sessionEnded = false
  world.choices = []
  world.blocks.push({ id: 'legacy-empty-choice-save', kind: 'narration', text: '林间空地的余烬已经冷却，但旅程仍可继续。' })
  localStorage.setItem(key, JSON.stringify(archive))
})
await page.reload({ waitUntil: 'networkidle' })
const continueSavedGame = page.getByRole('button', { name: '继续游戏' })
if (await continueSavedGame.count()) await continueSavedGame.click()
await page.getByRole('button', { name: /观察.*的新变化/ }).waitFor({ state: 'visible', timeout: 10000 })
const repairedEmptySave = await page.evaluate(() => JSON.parse(localStorage.getItem('stateful-story-template-save') || '{}').worlds?.['the-wild-road'])
if (repairedEmptySave.choices.length < 1 || repairedEmptySave.choices.length > 3) throw new Error('already-stuck empty-choice save was not repaired on load')

console.log('choice recovery ok · natural options=3 · replyless commit keeps grounded siblings · checkpoint preserved · legacy and empty-choice saves repaired')
await browser.close()
