import type { StoryCartridge, StoryDangerDirector, StoryDirector, StoryImageDirector } from '../types'

const coverImage = new URL('../img/worlds/seventh-dock.webp', import.meta.url).href
const entryImage = new URL('../img/worlds/seventh-dock-entry.webp', import.meta.url).href

function storyDirector(locale: 'zh' | 'en'): StoryDirector {
  const zh = locale === 'zh'
  return {
    mode: 'guided',
    fixedWorldRules: zh ? [
      '涨潮、警戒队、港务路线与补给是可执行的现实压力；已确认地点、时间、物品、小队和后果不能静默改写。',
      '弥拉、奥伦和赛是完整当前小队。遇见新人不能替换他们，明确离队必须有可见原因和协议命令。',
      '低洼通道会随潮位关闭，公开行动会提高警戒；港城人物只知道亲历、听说或读到的事实。',
    ] : [
      'The tide, harbor watch, routes and supplies are executable pressures. Confirmed places, time, ownership, party and consequences cannot be silently rewritten.',
      'Mira, Oren and Sai are the complete current party. New people never replace them; departure needs a visible cause and protocol command.',
      'Low routes close as water rises and public actions raise alert. People know only what they witnessed, heard or read.',
    ],
    generationRules: zh ? [
      '每轮推进航线册目标或一个具体港城后果；移动、等待和高风险行动必须改变时间、潮位、警戒、补给、地点或已知事实。',
      '危险允许侦察、交涉、小队分工、工具、绕行、逃离或正面冲突，不能把战斗写成唯一答案。',
      '失败产生受伤、损失、追击、路线关闭或关系压力，不删档，也不能让小队成员无故消失。',
    ] : [
      'Every turn advances the route-ledger objective or a concrete harbor consequence. Travel, waiting and risky action change time, tide, alert, supplies, place or known facts.',
      'Danger allows scouting, negotiation, party roles, tools, detours, escape or confrontation; combat is never the only answer.',
      'Failure causes injury, loss, pursuit, route closure or relationship pressure, never save deletion or silent party loss.',
    ],
    choiceIntents: zh ? ['观察、交涉或小队协作', '移动、潜行或利用工具', '冒险突破、撤离或正面应对'] : ['observe, negotiate, or coordinate', 'move, sneak, or use a tool', 'take a risk, withdraw, or confront'],
    maxActiveThreads: 3,
  }
}

function dangerDirector(locale: 'zh' | 'en'): StoryDangerDirector {
  const zh = locale === 'zh'
  return {
    minSafeTurns: 2, maxSafeTurns: 3, cooldownTurns: 1,
    escalationStats: ['tide', 'supplies', 'alert'],
    threatPalette: zh
      ? ['警戒队正在收紧搜查范围', '潮门正在提前关闭', '低洼通道突然开始进水', '沉船结构正在危险坍塌', '走私者在前方设置伏击', '一处旧港务机关被触发']
      : ['the harbor watch is tightening its search', 'a tide gate is closing early', 'a low passage is flooding fast', 'a wreck structure is collapsing', 'smugglers have prepared an ambush', 'an old harbor mechanism has been triggered'],
    methods: zh ? ['侦察、交涉或小队分工', '潜行、绕行或撤退', '使用工具、环境或正面突破'] : ['scout, negotiate, or coordinate the party', 'sneak, detour, or withdraw', 'use a tool, the environment, or break through'],
    physicalCombat: 'rare',
    resolution: {
      skill: zh ? '港区应变' : 'Harbor Response', modifier: 2, dcBySeverity: [9, 11, 13, 15, 17], criticalDcBonus: 3,
      fallbackCosts: [{ statId: 'alert', operation: 'add', amount: 12 }],
    },
  }
}

const shared = {
  schemaVersion: 1 as const,
  id: 'seventh-dock',
  initialPartyMemberIds: ['mira', 'oren', 'sai'],
  coverImage,
  entryImage,
  theme: { outer: '#071113', surface: '#0c1a1d', paper: '#d7d8cb', ink: '#1e2929', muted: '#718184', accent: '#3d7c82', danger: '#b6603c', gold: '#d3a653', material: 'harbor' as const },
  itemImageDirection: 'archival harbor field-guide object study, weathered brass, salt-stained canvas and dark teal enamel, soft rust-colored lantern light, tactile editorial realism',
  sceneImageDirection: 'cinematic editorial travel-journal illustration of a fictional old port, salt-stained paper texture, muted teal and rust palette, wet stone, canvas sails and warm lantern light, grounded human scale',
  sceneImageAvoid: 'the wide establishing view of Quay Seven, the opening tide gauges, the same canvas-sail skyline, or an empty misty quay composition',
  imageDirector: {
    maxQuietTurns: 4,
    softCooldownTurns: 2,
    guaranteedTriggers: ['new-location', 'rare-item', 'party-change', 'chapter-checkpoint'],
    softTriggers: ['relationship-change', 'objective-change', 'skill-outcome'],
  } satisfies StoryImageDirector,
  audioTheme: {
    material: 'harbor' as const, bpm: 54, rootHz: 110, scale: [0, 3, 5, 7, 10],
    levels: { music: .12, ambient: .1, sfx: .18, master: .24 },
    tension: [
      { statId: 'tide', direction: 'high' as const, weight: .45 },
      { statId: 'alert', direction: 'high' as const, weight: .4 },
      { statId: 'supplies', direction: 'low' as const, weight: .15 },
    ],
  },
}

export const seventhDock: StoryCartridge = {
  ...shared, locale: 'zh',
  copy: { title: '第七码头', subtitle: '涨潮前的港城手记', promise: '世界记得你选择了谁，也记得你放弃了谁。', enter: '翻开第一程', continue: '继续这段旅程', customAction: '写下自己的行动', itemImagingTitle: '潮痕正在显影', itemImagingBody: '你摊开行囊，港务纸页开始按这座城的光线与材质记录每件物品。第一幅显影完成后，其余记录会在后台继续。' },
  director: storyDirector('zh'),
  dangerDirector: dangerDirector('zh'),
  initialFacts: {},
  domainRules: [
    {
      id: 'opening-traces', when: { factUnset: ['opening-method'] }, action: { exact: ['检查外堤上的测量痕迹'] },
      effects: [{ type: 'fact', key: 'opening-method', value: 'traces' }, { type: 'fact', key: 'reversed-tide-mark-found', value: true }, { type: 'stat', id: 'tide', delta: 8 }, { type: 'stat', id: 'supplies', delta: -1 }, { type: 'clock', value: '潮前 01:52' }, { type: 'objective', value: '判断反向潮标是路线还是警告' }],
      successText: '你沿湿石缝找出被盐渍盖住的铜钉线。弥拉压低防潮灯，光下最后三步测量痕迹显然被人故意磨掉；更深处却藏着一枚反向刻入的潮标。测绘员留下的不是完整路线，而是一条只允许谨慎的人继续读下去的警告。',
      successChoices: ['沿反向潮标进入沉船巷', '请弥拉解释这种暗号', '先在高处确认警戒队的位置'],
    },
    {
      id: 'opening-mira', when: { factUnset: ['opening-method'] }, action: { exact: ['先问弥拉为什么隐瞒警戒队'] },
      effects: [{ type: 'fact', key: 'opening-method', value: 'mira' }, { type: 'fact', key: 'mira-watch-history-revealed', value: true }, { type: 'stat', id: 'alert', delta: 7 }, { type: 'clock', value: '潮前 02:02' }, { type: 'objective', value: '决定是否用弥拉掌握的旧警戒路线进入沉船巷' }],
      successText: '你没有顺着她的话继续走，而是要求弥拉先说清楚。她从衣领里取出一枚警戒队旧铜片：测绘员失踪前，她曾负责绘制内港水路；失踪后，两个人的名字一起从档案里被删掉。她的沉默提高了风险，但她也把一条只有前警戒队员知道的入口交到了你手上。',
      successChoices: ['相信弥拉，走旧警戒路线', '先检查铜片和外堤潮标是否对应', '要求她说明警戒队今晚在找什么'],
    },
    {
      id: 'opening-route', when: { factUnset: ['opening-method'] }, action: { exact: ['查看通往沉船巷的路线'] },
      effects: [{ type: 'fact', key: 'opening-method', value: 'route' }, { type: 'fact', key: 'upper-freight-route-found', value: true }, { type: 'stat', id: 'tide', delta: 5 }, { type: 'stat', id: 'alert', delta: 4 }, { type: 'clock', value: '潮前 01:58' }, { type: 'objective', value: '选择低处潮道或高处搬运通道进入沉船巷' }],
      successText: '你先摊开航图，把涨潮速度、警戒灯位和仓墙高度叠在一起。低处潮道最快，却会在四十分钟内封死；上方还有一条没有画在图上的旧搬运通道，入口处留着已经解散的工会绳结。路线不会替你做决定，但风险第一次有了清楚形状。',
      successChoices: ['抢走低处潮道', '寻找高处搬运通道的入口', '问弥拉谁还认得旧工会绳结'],
    },
  ],
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
    { id: 'mira', name: '弥拉', role: '领航员', vitality: 8, stress: 3, detail: '熟悉港城暗号、潮门和被官方删改的航路。', lore: '她曾替警戒队绘制内港水路，测绘员失踪后，档案里也不再有她的名字。', skills: [{ id: 'observe', label: '观察', value: 4 }, { id: 'negotiate', label: '交涉', value: 2 }] },
    { id: 'oren', name: '奥伦', role: '旧港搬运工', vitality: 10, stress: 2, hiddenUntilIntroduced: true, detail: '力气大，知道仓栈之间不写在地图上的搬运通道。', lore: '旧港工会解散后，他仍替失业搬运工保管一串废弃仓门钥匙。', skills: [{ id: 'stealth', label: '潜行', value: 2 }, { id: 'will', label: '意志', value: 4 }] },
    { id: 'sai', name: '赛', role: '档案学徒', vitality: 6, stress: 4, hiddenUntilIntroduced: true, detail: '能辨认旧纸、墨水年代和港务文书的删改痕迹。', lore: '他相信港城真正的历史藏在被撕走的页码和错误的索引里。', skills: [{ id: 'observe', label: '观察', value: 3 }, { id: 'negotiate', label: '交涉', value: 3 }] },
  ],
  initialMap: [
    { id: 'outer', label: '外堤', current: true, detail: '第七码头最外侧的石堤，系船柱无船却已被潮水打湿。', lore: '旧潮尺仍按废弃历法刻度；港务局换过三次牌子，却没有换掉它。', facts: ['涨潮封路前约剩两小时', '警戒队已经提前进入内港'] },
    { id: 'wreck', label: '沉船巷', connectedTo: '外堤', detail: '夹在旧船壳和仓墙之间的窄巷，涨潮后下层通道会完全没入水中。', lore: '早年的拆船工把无法登记的货物藏在这里，后来警戒队接管了入口。', facts: ['测绘员最后一次传回坐标的地点', '反向潮标指向这里'] },
  ],
  initialInventory: [
    { id: 'lamp', label: '防潮灯', count: 1, detail: '铜框和深青搪瓷包住的密封油灯。', effect: '照亮近处并显出湿石上的新痕迹；强光会提高被警戒队发现的风险。', lore: '外港领航员在雾季使用的标准工具，灯罩上的三道划痕代表三次落水后仍可点燃。', metrics: [{ label: '照明', value: '近距 8 米' }, { label: '燃料', value: '约 3 小时' }], imagePrompt: 'single sealed old harbor storm lamp, weathered brass frame and dark teal enamel, three scratches on glass housing, salt-stained field-guide still life, rust lantern light, object only, no text, square' },
    { id: 'ration', label: '压缩口粮', count: 8, detail: '用蜡纸包裹的咸鱼、黑麦和海藻压块。', effect: '每份可支持一人一次短休，长时间浸水后会失效。', lore: '港城在封潮期间给夜班工人的廉价配给，味道很差但不会引来鼠群。', metrics: [{ label: '恢复', value: '补给 +1' }, { label: '重量', value: '每份 180 克' }], imagePrompt: 'single wax-paper wrapped compressed harbor ration made of rye fish and seaweed, weathered field kit still life, no readable label, object only, square' },
    { id: 'rope', label: '短绳', count: 1, detail: '吸过盐水的六米麻绳，末端打着搬运工结。', effect: '可固定一人、捆扎轻货或越过短距离落差；不能承受两人同时悬挂。', lore: '绳结属于旧港搬运工会，奥伦一眼就能认出是谁教的。', metrics: [{ label: '长度', value: '6 米' }, { label: '安全负重', value: '约 100 千克' }], imagePrompt: 'single coil of salt-stained six meter hemp rope with an old stevedore knot, harbor artifact study, object only, no text, square' },
  ],
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
[inventory: action="add" item="残缺航线册" count="1" rarity="rare" detail="被潮水泡皱、只剩后半部的测绘手册" effect="能指出一条官方航图上不存在的内港水道；缺页使入口位置仍不完整" lore="失踪测绘员用私人暗号修订，证明港务档案曾被系统删改" metrics="完整度: 46%|可辨航标: 7 处" image_prompt="single water-damaged fragmentary harbor route ledger with torn pages, hand-drawn lines but no readable text, brass clasp, salt-stained archival still life, object only, square"]
[session_end: reason="找到航线册，适合在潮门关闭前暂停"]` },
  ],
}

export const seventhDockEn: StoryCartridge = {
  ...shared, locale: 'en',
  copy: { title: 'Seventh Dock', subtitle: 'A harbor journal before the tide', promise: 'The world remembers whom you chose—and whom you left behind.', enter: 'Open the first passage', continue: 'Continue the journey', customAction: 'Write your own action', itemImagingTitle: 'The tide marks are developing', itemImagingBody: 'Opening your kit lets the harbor folio record each object in this city’s own light and material language. The remaining plates will continue developing in the background.' },
  director: storyDirector('en'),
  dangerDirector: dangerDirector('en'),
  initialFacts: {},
  domainRules: [
    {
      id: 'opening-traces', when: { factUnset: ['opening-method'] }, action: { exact: ['Inspect the survey marks on the outer quay'] },
      effects: [{ type: 'fact', key: 'opening-method', value: 'traces' }, { type: 'fact', key: 'reversed-tide-mark-found', value: true }, { type: 'stat', id: 'tide', delta: 8 }, { type: 'stat', id: 'supplies', delta: -1 }, { type: 'clock', value: '01:52 before tide' }, { type: 'objective', value: 'Determine whether the reversed tide mark is a route or warning' }],
      successText: 'You trace the brass survey line through salt-wet joints while Mira shades the lamp. The final three measurements were deliberately ground away, but beneath them lies a tide mark cut in reverse. The missing surveyor left no complete route—only a warning meant for someone cautious enough to keep reading.',
      successChoices: ['Follow the reversed mark into Wreck Alley', 'Ask Mira to explain the cipher', 'Confirm the watch position from higher ground'],
    },
    {
      id: 'opening-mira', when: { factUnset: ['opening-method'] }, action: { exact: ['Ask why Mira hid the watch from us'] },
      effects: [{ type: 'fact', key: 'opening-method', value: 'mira' }, { type: 'fact', key: 'mira-watch-history-revealed', value: true }, { type: 'stat', id: 'alert', delta: 7 }, { type: 'clock', value: '02:02 before tide' }, { type: 'objective', value: 'Decide whether to use Mira’s old watch route into Wreck Alley' }],
      successText: 'You stop before following her lead and ask for the missing truth. Mira removes an old watch token from beneath her collar: she charted the inner harbor before the surveyor vanished, and afterward both names were removed from the archive. Her silence has raised the risk, but she now gives you an entrance only a former watch navigator would know.',
      successChoices: ['Trust Mira and take the old watch route', 'Compare her token with the quay marks', 'Ask what the watch is searching for tonight'],
    },
    {
      id: 'opening-route', when: { factUnset: ['opening-method'] }, action: { exact: ['Study the route into Wreck Alley'] },
      effects: [{ type: 'fact', key: 'opening-method', value: 'route' }, { type: 'fact', key: 'upper-freight-route-found', value: true }, { type: 'stat', id: 'tide', delta: 5 }, { type: 'stat', id: 'alert', delta: 4 }, { type: 'clock', value: '01:58 before tide' }, { type: 'objective', value: 'Choose the lower tide lane or upper freight passage into Wreck Alley' }],
      successText: 'You overlay tide speed, watch lights, and warehouse height on the chart. The lower lane is fastest but will seal within forty minutes. Above it, an uncharted freight passage begins beneath a dissolved union’s rope knot. The route does not choose for you, but its risks finally have a clear shape.',
      successChoices: ['Take the lower tide lane now', 'Find the upper freight entrance', 'Ask Mira who still recognizes the union knot'],
    },
  ],
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
    { id: 'mira', name: 'Mira', role: 'Navigator', vitality: 8, stress: 3, detail: 'Knows harbor ciphers, tide gates, and routes erased from official charts.', lore: 'She once charted the inner harbor for the watch. After the surveyor vanished, her name disappeared from the archive too.', skills: [{ id: 'observe', label: 'Observe', value: 4 }, { id: 'negotiate', label: 'Negotiate', value: 2 }] },
    { id: 'oren', name: 'Oren', role: 'Old-port stevedore', vitality: 10, stress: 2, hiddenUntilIntroduced: true, detail: 'Strong, patient, and familiar with freight passages omitted from public maps.', lore: 'When the old union dissolved, he kept a ring of keys to warehouses no longer meant to exist.', skills: [{ id: 'stealth', label: 'Stealth', value: 2 }, { id: 'will', label: 'Will', value: 4 }] },
    { id: 'sai', name: 'Sai', role: 'Archive apprentice', vitality: 6, stress: 4, hiddenUntilIntroduced: true, detail: 'Can date paper, ink, and the edits hidden inside harbor records.', lore: 'He believes the city’s real history survives in torn folios and deliberately broken indexes.', skills: [{ id: 'observe', label: 'Observe', value: 3 }, { id: 'negotiate', label: 'Negotiate', value: 3 }] },
  ],
  initialMap: [
    { id: 'outer', label: 'Outer Quay', current: true, detail: 'The outermost stone quay of Seventh Dock. Its empty mooring posts are already wet.', lore: 'The old tide gauge still follows an abandoned calendar; three harbor authorities changed their signs without replacing it.', facts: ['About two hours remain before the tide seals the route', 'The watch entered the inner harbor early'] },
    { id: 'wreck', label: 'Wreck Alley', connectedTo: 'Outer Quay', detail: 'A narrow lane between old hulls and warehouse walls. Its lower passage disappears at high tide.', lore: 'Breakers once hid unregistered freight here. The watch later took control of the entrance.', facts: ["The surveyor's last coordinates came from here", 'A reversed tide mark points this way'] },
  ],
  initialInventory: [
    { id: 'lamp', label: 'Storm lamp', count: 1, detail: 'A sealed oil lamp inside weathered brass and dark teal enamel.', effect: 'Reveals fresh marks on wet stone within eight meters; bright light can alert the watch.', lore: 'Standard fog-season gear for outer-harbor navigators. Three housing scratches mark three immersions it survived.', metrics: [{ label: 'Light', value: '8 m' }, { label: 'Fuel', value: 'About 3 hours' }], imagePrompt: 'single sealed old harbor storm lamp, weathered brass frame and dark teal enamel, three scratches on glass housing, salt-stained field-guide still life, rust lantern light, object only, no text, square' },
    { id: 'ration', label: 'Compressed ration', count: 8, detail: 'Salt fish, rye, and seaweed pressed into a wax-paper block.', effect: 'One portion supports one person through a short rest; prolonged soaking ruins it.', lore: 'Cheap night-shift provisions issued during harbor closures. Unpleasant, but rats ignore it.', metrics: [{ label: 'Recovery', value: 'Supplies +1' }, { label: 'Weight', value: '180 g each' }], imagePrompt: 'single wax-paper wrapped compressed harbor ration made of rye fish and seaweed, weathered field kit still life, no readable label, object only, square' },
    { id: 'rope', label: 'Short rope', count: 1, detail: 'Six meters of salt-soaked hemp ending in a stevedore knot.', effect: 'Secures one person, ties light cargo, or crosses a short drop; unsafe for two suspended people.', lore: 'The knot belongs to the old dock union, and Oren can tell who taught it.', metrics: [{ label: 'Length', value: '6 m' }, { label: 'Safe load', value: 'About 100 kg' }], imagePrompt: 'single coil of salt-stained six meter hemp rope with an old stevedore knot, harbor artifact study, object only, no text, square' },
  ],
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
[inventory: action="add" item="Fragmentary route ledger" count="1" rarity="rare" detail="A tide-warped survey book with only its latter half intact" effect="Reveals an inner-harbor channel absent from official charts; missing pages leave its entrance uncertain" lore="The missing surveyor revised it in private cipher, evidence that harbor records were systematically altered" metrics="Complete: 46%|Legible markers: 7" image_prompt="single water-damaged fragmentary harbor route ledger with torn pages, hand-drawn lines but no readable text, brass clasp, salt-stained archival still life, object only, square"]
[session_end: reason="The route ledger is found; this is a safe point to pause before the tide gate closes"]` },
  ],
}
