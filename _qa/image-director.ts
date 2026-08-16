import { CARTRIDGES } from '../src/story/cartridges'
import { extractSceneImagePrompt, extractSceneImageSubject, parseStoryProtocol } from '../src/story/engine/protocol'
import { applyParsedScene, createInitialSave } from '../src/story/engine/reducer'
import { shouldUsePlayerImageReference, upgradePendingSceneImagePrompts } from '../src/story/engine/imageDirector'
import { SCENE_IMAGE_PROMPT_VERSION } from '../src/story/types'

function equal(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`)
}

function latestImage(save: ReturnType<typeof createInitialSave>) {
  return [...save.blocks].reverse().find((block) => block.kind === 'image')
}

const fallbackCartridge = Object.values(CARTRIDGES)[0]
const rooftopApartment = CARTRIDGES['rooftop-apartment'] ?? fallbackCartridge
const seventhDock = CARTRIDGES['seventh-dock'] ?? fallbackCartridge
const sourceTheWildRoad = CARTRIDGES['the-wild-road'] ?? fallbackCartridge
const theWildRoad = { ...sourceTheWildRoad, sceneImageAvoid: [sourceTheWildRoad.sceneImageAvoid, 'ancient crossroads with three roads'].filter(Boolean).join(', ') }

const wildStart = createInitialSave(theWildRoad)
const quietSkill = applyParsedScene(wildStart, parseStoryProtocol(`你辨认出路边的新脚印，但暂时没有离开十字路口。
[skill_check: skill="观察" dc="10" rolls="12" modifier="1" total="13" result="success"]
[choices: "继续观察"|"走向村庄"|"检查旧钥匙"]`, 'zh'), theWildRoad, '观察脚印')
equal(latestImage(quietSkill)?.id, 'image-0', 'soft trigger respects the two-turn cooldown')

const arrived = applyParsedScene(quietSkill, parseStoryProtocol(`你穿过树林，第一次抵达溪谷。
[map_update: new_location="无名溪谷" connected_to="旧十字路口"]
[choices: "查看石龛"|"沿溪前进"|"原路返回"]`, 'zh'), theWildRoad, '前往溪谷')
equal(latestImage(arrived)?.id, 'image-2', 'first arrival receives a local director image')
equal(latestImage(arrived)?.data?.source, 'director', 'fallback source is recorded')
equal(latestImage(arrived)?.data?.reason, 'new-location', 'fallback trigger is recorded')

const checkpoint = applyParsedScene(arrived, parseStoryProtocol(`你把今天的道路记进行记。
[session_end: reason="今天的探索暂告一段落"]`, 'zh'), theWildRoad, '整理行记')
equal(latestImage(checkpoint)?.id, 'image-3', 'chapter checkpoint is guaranteed even inside the cooldown')
equal(latestImage(checkpoint)?.data?.reason, 'chapter-checkpoint', 'chapter fallback reason is recorded')

const proposed = applyParsedScene(createInitialSave(theWildRoad), parseStoryProtocol('你已离开旧十字路口，在湖畔仓库里打开一只宝箱。\n[map_update: new_location="湖畔仓库" connected_to="旧十字路口"]\n[choices: "检查宝箱"|"查看仓库"|"离开湖畔"]', 'zh'), theWildRoad, '打开宝箱', 'ancient crossroads with three roads and a treasure chest')
equal(String(latestImage(proposed)?.data?.prompt).includes('Current location hint: 湖畔仓库'), true, 'AI-triggered image is grounded in the authoritative current location')
equal(String(latestImage(proposed)?.data?.prompt).includes('ancient crossroads with three roads'), false, 'AI proposal content cannot reintroduce the opening composition')
equal(String(latestImage(proposed)?.data?.prompt).includes(theWildRoad.sceneImageDirection ?? ''), true, 'AI-triggered image inherits cartridge art direction')
equal(latestImage(proposed)?.data?.source, 'ai', 'AI proposal source is recorded')

const cleanProposal = applyParsedScene(createInitialSave(theWildRoad), parseStoryProtocol('你已经进入湖畔仓库，在倾斜的木梁下打开一只铜边宝箱。\n[map_update: new_location="湖畔仓库" connected_to="旧十字路口"]\n[choices: "检查宝箱"|"查看仓库"|"离开湖畔"]', 'zh'), theWildRoad, '打开宝箱', 'inside a lakeside warehouse, a traveler kneels beneath a leaning roof beam and opens one brass-bound chest, medium low-angle shot')
equal(String(latestImage(cleanProposal)?.data?.prompt).includes('inside a lakeside warehouse'), true, 'grounded AI shot proposal is preserved')
equal(String(latestImage(cleanProposal)?.data?.prompt).includes('Ignore all cover art and opening-scene imagery'), true, 'every prompt carries the fresh-shot contract')
equal(String(latestImage(cleanProposal)?.data?.prompt).includes('Old Crossroads'), false, 'opening residue labels are used for filtering but never sent to the image model')
equal(Number(latestImage(cleanProposal)?.data?.promptVersion), SCENE_IMAGE_PROMPT_VERSION, 'new prompts record their version')
equal(latestImage(cleanProposal)?.data?.playerVisible, 'true', 'a visible acting traveler is marked as the player')
equal(String(latestImage(cleanProposal)?.data?.prompt).includes('dominant visible human'), true, 'player action cannot be reassigned to another character')

equal(shouldUsePlayerImageReference('medium shot of the player protagonist gripping a copper rail'), true, 'character-forward shot uses player identity reference')
equal(shouldUsePlayerImageReference('wide establishing shot with the player protagonist crossing a flooded bridge'), true, 'wide shots still use identity when the player is visible')
equal(shouldUsePlayerImageReference('wide establishing shot of an empty flooded city'), false, 'environmental establishing shot avoids portrait-reference composition lock')

const environmentOnly = applyParsedScene(createInitialSave(theWildRoad), parseStoryProtocol('你推开门，镜头随后停在一座无人钟楼的内部。\n[map_update: new_location="钟楼内部"]\n[choices: "进入钟楼"|"观察齿轮"|"退回门外"]', 'zh'), theWildRoad, '推开钟楼门', 'empty clock tower interior, wide environment-only shot', 'environment')
equal(latestImage(environmentOnly)?.data?.playerVisible, 'false', 'explicit environment shot does not use the player reference')

const widePlayerAction = applyParsedScene(createInitialSave(theWildRoad), parseStoryProtocol('你独自穿过坍塌的长桥，双手抓住被风吹紧的绳索。\n[map_update: new_location="坍塌长桥"]\n[choices: "继续过桥"|"固定绳索"|"退回桥头"]', 'zh'), theWildRoad, '抓住绳索过桥', 'wide shot of one small figure crossing a collapsed bridge in strong wind', 'player')
equal(latestImage(widePlayerAction)?.data?.playerVisible, 'true', 'explicit player subject survives a wide camera description')
equal(String(latestImage(widePlayerAction)?.data?.prompt).includes('dominant visible human'), true, 'wide player action keeps the identity contract')

const companionLed = applyParsedScene(createInitialSave(theWildRoad), parseStoryProtocol('你站在远处看守退路，猎人独自上前安抚受惊的马。\n[choices: "继续观察"|"提醒猎人"|"退到树林"]', 'zh'), theWildRoad, '留在远处警戒', 'medium shot of a hunter calming a frightened horse while the player remains a tiny background lookout', 'others')
equal(latestImage(companionLed)?.data?.playerVisible, 'false', 'an incidental background player does not own the avatar reference')

const expressionCartridge = {
  ...seventhDock,
  characters: seventhDock.characters.length ? seventhDock.characters : [{ id: 'qa-speaker', name: '守门人', role: '值守', vitality: 80, stress: 12, skills: [] }],
  imageDirector: { ...seventhDock.imageDirector!, guaranteedTriggers: [...seventhDock.imageDirector!.guaranteedTriggers, 'character-expression' as const] },
}
const expressionSpeaker = expressionCartridge.characters[0]
const expressionTurn = applyParsedScene(createInitialSave(expressionCartridge), parseStoryProtocol(`[${expressionSpeaker.name}] [main] [克制]: "潮门一旦连续关闭三道，就不是例行调度。你留在我能看见的地方。"\n[choices: "答应留下"|"询问潮门"|"查看路线"]`, 'zh'), expressionCartridge, '听她说明', 'empty harbor gates, wide environment-only shot', 'environment')
equal(latestImage(expressionTurn)?.data?.reason, 'character-expression', 'configured important-character dialogue overrides a generic environment proposal')
equal(String(latestImage(expressionTurn)?.data?.prompt).includes('medium close-up'), true, 'important dialogue requests a readable expression shot')
const unknownExpression = applyParsedScene(createInitialSave(expressionCartridge), parseStoryProtocol(`[临时守潮人] [main] [平静]: "第三道潮门不是被浪推上的；有人从控制室切断了绞盘。"\n[dialogue_focus: speaker="临时守潮人" expression="压低声音，目光扫向控制室，手指攥紧绳钩"]\n[choices: "询问控制室"|"检查绞盘"|"先退回外堤"]`, 'zh'), expressionCartridge, '听守潮人说明')
equal(latestImage(unknownExpression)?.data?.reason, 'character-expression', 'important dialogue is image-worthy regardless of speaker roster rank')
equal(String(latestImage(unknownExpression)?.data?.prompt).includes('目光扫向控制室'), true, 'explicit dialogue expression reaches the prompt')

const legacyQueued = {
  ...cleanProposal,
  blocks: cleanProposal.blocks.map((block) => block.id === 'image-1' ? { ...block, data: { ...block.data, prompt: theWildRoad.opening.imagePrompt, promptVersion: 0, status: 'generating' as const } } : block),
}
const upgraded = upgradePendingSceneImagePrompts(legacyQueued, theWildRoad)
const upgradedImage = latestImage(upgraded)
equal(Number(upgradedImage?.data?.promptVersion), SCENE_IMAGE_PROMPT_VERSION, 'old pending prompt is upgraded on restore')
equal(upgradedImage?.data?.status, 'queued', 'interrupted legacy generation returns to the queue')
equal(String(upgradedImage?.data?.prompt).includes('empty ancient countryside crossroads'), false, 'upgraded pending prompt drops the old opening prompt')

let guided = createInitialSave(seventhDock)
const quietTurns = seventhDock.imageDirector?.maxQuietTurns ?? 4
for (let turn = 1; turn <= quietTurns; turn += 1) {
  guided = applyParsedScene(guided, parseStoryProtocol(`港口里发生了第 ${turn} 个可见变化。\n[clock: value="夜潮 ${turn}"]\n[choices: "查看左侧"|"查看右侧"|"留在原地"]`, 'zh'), seventhDock, `行动 ${turn}`)
}
equal(latestImage(guided)?.id, `image-${quietTurns}`, 'cartridge forces an image at its configured quiet-turn limit')
equal(latestImage(guided)?.data?.reason, 'cadence', 'quiet-turn fallback is identified as cadence')

const roofStart = createInitialSave(rooftopApartment)
const relationship = applyParsedScene(roofStart, parseStoryProtocol(`乔终于愿意把相机交出来。
[reputation: npc="乔" action="trusted"]
[choices: "整理照片"|"继续交谈"|"检查账本"]`, 'zh'), rooftopApartment, '听乔解释')
equal(latestImage(relationship)?.id, 'image-0', 'relationship change does not over-generate on the first turn')

equal(extractSceneImagePrompt('正文\n[image_prompt: "night road under rain, no text, 4:3"]'), 'night road under rain, no text, 4:3', 'remote-compatible scene prompt extraction')
equal(extractSceneImageSubject('正文\n[image_subject: "player"]'), 'player', 'scene subject metadata extraction')
equal(extractSceneImageSubject('正文\n[image_subject: "environment"]'), 'environment', 'environment subject metadata extraction')

console.log('image director ok · proposal grounding · important-dialogue portrait · opening-residue filter · prompt upgrade · selective identity reference · cadence fallback')
