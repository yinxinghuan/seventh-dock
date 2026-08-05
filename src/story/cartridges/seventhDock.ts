import type { StoryCartridge } from '../types'

const coverImage = new URL('../img/worlds/seventh-dock.webp', import.meta.url).href

const shared = {
  schemaVersion: 1 as const,
  id: 'seventh-dock',
  coverImage,
  theme: { outer: '#071113', surface: '#0c1a1d', paper: '#d7d8cb', ink: '#1e2929', muted: '#718184', accent: '#3d7c82', danger: '#b6603c', gold: '#d3a653', material: 'harbor' as const },
}

export const seventhDock: StoryCartridge = {
  ...shared, locale: 'zh',
  copy: { title: '第七码头', subtitle: '涨潮前的港城手记', promise: '世界记得你选择了谁，也记得你放弃了谁。', enter: '翻开第一程', continue: '继续这段旅程', customAction: '写下自己的行动' },
  statDefinitions: [
    { id: 'tide', label: '潮位', min: 0, max: 100, initial: 28, display: 'bar', warningAt: 70, dangerAt: 90 },
    { id: 'supplies', label: '补给', min: 0, max: 12, initial: 8, inverse: true, display: 'number', warningAt: 3, dangerAt: 0 },
    { id: 'alert', label: '警戒', min: 0, max: 100, initial: 15, display: 'bar', warningAt: 60, dangerAt: 85 },
  ],
  drawerLabels: { party: '小队', map: '航图', inventory: '行囊', log: '手记' },
  opening: {
    location: '第七码头 · 外堤', time: '潮前 02:10', objective: '找到失踪测绘员留下的航线册',
    imagePrompt: 'misty fictional port city before a dangerous tide, old stone quay number seven, canvas sails and rusted tide gauges, cinematic editorial travel journal illustration, muted teal and rust palette, no text, no UI, 4:3',
    blocks: [
      { id: 'd0', kind: 'narration', text: '潮水还在外堤以下，但所有系船柱都已经湿了。第七码头今晚没有船靠岸。' },
      { id: 'd1', kind: 'dialogue', speaker: '弥拉', tone: '克制', text: '测绘员最后一次传回坐标，是在沉船巷。警戒队比我们早到了半个小时。' },
      { id: 'd2', kind: 'event', text: '当前目标：在涨潮封路前找到航线册。' },
    ],
    choices: [
      { id: 'accept', label: '检查外堤上的测量痕迹' }, { id: 'ask', label: '先问弥拉为什么隐瞒警戒队' }, { id: 'route', label: '查看通往沉船巷的路线' },
    ],
  },
  characters: [
    { id: 'mira', name: '弥拉', role: '领航员', vitality: 8, stress: 3, skills: [{ id: 'observe', label: '观察', value: 4 }, { id: 'negotiate', label: '交涉', value: 2 }] },
    { id: 'oren', name: '奥伦', role: '旧港搬运工', vitality: 10, stress: 2, skills: [{ id: 'stealth', label: '潜行', value: 2 }, { id: 'will', label: '意志', value: 4 }] },
    { id: 'sai', name: '赛', role: '档案学徒', vitality: 6, stress: 4, skills: [{ id: 'observe', label: '观察', value: 3 }, { id: 'negotiate', label: '交涉', value: 3 }] },
  ],
  initialMap: [{ id: 'outer', label: '外堤', current: true }, { id: 'wreck', label: '沉船巷', connectedTo: '外堤' }],
  initialInventory: [{ id: 'lamp', label: '防潮灯', count: 1 }, { id: 'ration', label: '压缩口粮', count: 8 }, { id: 'rope', label: '短绳', count: 1 }],
  demoTurns: [
    { match: ['检查', '痕迹', '路线'], content: `你沿着湿透的石缝寻找铜钉留下的测量线。弥拉把灯压低，避免光越过防浪墙。
[弥拉] [main] [专注]: "这里。刻痕朝向沉船巷，但最后三步有人故意抹掉了。"
[skill_check: skill="观察" dc="12" rolls="15" modifier="3" total="18" result="success"]
你在盐渍下找到一枚反向刻入的潮标。测绘员留下的不是路线，而是警告。
[widget: tide, value: 36]
[widget: supplies, value: 7]
[choices: "沿反向潮标进入沉船巷"|"要求弥拉解释她认得这种暗号的原因"|"让奥伦制造动静引开警戒队"]` },
    { match: ['解释', '弥拉', '要求'], content: `弥拉没有回避。她从衣领里取出一枚与潮标相同的旧铜片。
[弥拉] [main] [坚定]: "我曾替警戒队画过这条路。测绘员失踪之后，他们删掉了我的名字。"
[reputation: npc="弥拉" action="trusted"]
[widget: alert, value: 28]
[map_update: new_location="沉船巷" connected_to="外堤"]
潮声在窄巷下方变得沉重。你们已经没有原路返回的时间。
[choices: "相信弥拉并进入水下档案室"|"让赛记录她的供词再继续"|"在高处扎营等待警戒队离开"]`, imagePrompt: 'narrow flooded shipwreck alley in a fictional old port, three travelers entering under hanging sails, rising dark teal tide, rust lantern light, cinematic editorial travel journal illustration, no text, no UI, 4:3' },
    { match: ['进入', '相信', '记录', '扎营'], content: `你们在第一道潮门落下前抵达档案室。航线册只剩半本，最后一页写着一条尚未存在于官方地图上的航道。
[widget: tide, value: 52]
[inventory: action="add" item="残缺航线册" count="1"]
[session_end: reason="找到航线册，适合在潮门关闭前暂停"]` },
  ],
}

export const seventhDockEn: StoryCartridge = {
  ...shared, locale: 'en',
  copy: { title: 'Seventh Dock', subtitle: 'A harbor journal before the tide', promise: 'The world remembers whom you chose—and whom you left behind.', enter: 'Open the first passage', continue: 'Continue the journey', customAction: 'Write your own action' },
  statDefinitions: [
    { id: 'tide', label: 'Tide', min: 0, max: 100, initial: 28, display: 'bar', warningAt: 70, dangerAt: 90 },
    { id: 'supplies', label: 'Supplies', min: 0, max: 12, initial: 8, inverse: true, display: 'number', warningAt: 3, dangerAt: 0 },
    { id: 'alert', label: 'Alert', min: 0, max: 100, initial: 15, display: 'bar', warningAt: 60, dangerAt: 85 },
  ],
  drawerLabels: { party: 'Party', map: 'Chart', inventory: 'Kit', log: 'Journal' },
  opening: {
    location: 'Seventh Dock · Outer Quay', time: '02:10 before tide', objective: "Find the missing surveyor's route ledger",
    imagePrompt: 'misty fictional port city before a dangerous tide, old stone quay number seven, canvas sails and rusted tide gauges, cinematic editorial travel journal illustration, muted teal and rust palette, no text, no UI, 4:3',
    blocks: [
      { id: 'd0', kind: 'narration', text: 'The tide is still below the outer quay, yet every mooring post is already wet. No ship will berth at Seventh Dock tonight.' },
      { id: 'd1', kind: 'dialogue', speaker: 'Mira', tone: 'restrained', text: "The surveyor's last coordinates came from Wreck Alley. The watch arrived half an hour before us." },
      { id: 'd2', kind: 'event', text: 'Current objective: find the route ledger before the tide seals the road.' },
    ],
    choices: [
      { id: 'accept', label: 'Inspect the survey marks on the outer quay' }, { id: 'ask', label: 'Ask why Mira hid the watch from us' }, { id: 'route', label: 'Study the route into Wreck Alley' },
    ],
  },
  characters: [
    { id: 'mira', name: 'Mira', role: 'Navigator', vitality: 8, stress: 3, skills: [{ id: 'observe', label: 'Observe', value: 4 }, { id: 'negotiate', label: 'Negotiate', value: 2 }] },
    { id: 'oren', name: 'Oren', role: 'Old-port stevedore', vitality: 10, stress: 2, skills: [{ id: 'stealth', label: 'Stealth', value: 2 }, { id: 'will', label: 'Will', value: 4 }] },
    { id: 'sai', name: 'Sai', role: 'Archive apprentice', vitality: 6, stress: 4, skills: [{ id: 'observe', label: 'Observe', value: 3 }, { id: 'negotiate', label: 'Negotiate', value: 3 }] },
  ],
  initialMap: [{ id: 'outer', label: 'Outer Quay', current: true }, { id: 'wreck', label: 'Wreck Alley', connectedTo: 'Outer Quay' }],
  initialInventory: [{ id: 'lamp', label: 'Storm lamp', count: 1 }, { id: 'ration', label: 'Compressed ration', count: 8 }, { id: 'rope', label: 'Short rope', count: 1 }],
  demoTurns: [
    { match: ['inspect', 'mark', 'route', 'quay'], content: `You trace the brass survey line through the rain-soaked joints. Mira lowers the lamp before its light can cross the sea wall.
[Mira] [main] [focused]: "Here. The cuts point toward Wreck Alley, but someone deliberately erased the final three steps."
[skill_check: skill="Observe" dc="12" rolls="15" modifier="3" total="18" result="success"]
Beneath the salt bloom, you find a tide mark carved in reverse. The surveyor left a warning, not a route.
[widget: tide, value: 36]
[widget: supplies, value: 7]
[choices: "Follow the reversed tide mark into Wreck Alley"|"Ask Mira why she recognizes this cipher"|"Have Oren draw the watch away"]` },
    { match: ['explain', 'mira', 'ask', 'cipher'], content: `Mira does not look away. She draws an old copper token from beneath her collar, stamped with the same tide mark.
[Mira] [main] [determined]: "I once charted this road for the watch. When the surveyor vanished, they erased my name."
[reputation: npc="Mira" action="trusted"]
[widget: alert, value: 28]
[map_update: new_location="Wreck Alley" connected_to="Outer Quay"]
The tide grows heavy beneath the narrow lane. There is no longer time to return the way you came.
[choices: "Trust Mira and enter the submerged archive"|"Ask Sai to record her account first"|"Camp above the lane until the watch leaves"]`, imagePrompt: 'narrow flooded shipwreck alley in a fictional old port, three travelers entering under hanging sails, rising dark teal tide, rust lantern light, cinematic editorial travel journal illustration, no text, no UI, 4:3' },
    { match: ['enter', 'trust', 'record', 'camp'], content: `You reach the archive before the first tide gate falls. Only half the route ledger remains; its final page charts a channel absent from every official map.
[widget: tide, value: 52]
[inventory: action="add" item="Fragmentary route ledger" count="1"]
[session_end: reason="The route ledger is found; this is a safe point to pause before the tide gate closes"]` },
  ],
}
