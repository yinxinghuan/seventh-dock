import type { Locale } from './types'

const dictionary = {
  zh: {
    folio: 'ALTERU · 世界志 02',
    kicker: '会记住人物与选择的对话世界',
    world: '世界',
    textSize: '文字大小',
    textSizeSmall: '小',
    textSizeStandard: '标准',
    textSizeLarge: '大',
    audioEnable: '开启声音',
    audioMute: '关闭声音',
    audioUnavailable: '此设备不支持合成声音',
    stats: '当前世界数值',
    imageAlt: '{name}的剧情现场',
    imageFailedAria: '场景图片生成失败',
    imageGeneratingAria: '场景图片正在生成',
    imageIdle: '等待记录现场',
    imageQueued: '已进入绘制队列',
    imageGenerating: '正在记录现场，不影响继续行动',
    imageFailed: '现场记录失败',
    imageReady: '现场记录已归档',
    retry: '重试',
    retryAction: '重试这一步',
    summary: '阶段小结 · 已保存',
    notEnding: '这不是结局，可以从这里继续。',
    yourAction: '你的行动',
    demoFallback: '离线继续',
    aigramFallback: '改用 Aigram AI',
    reply: '回复',
    customAction: '自定义行动',
    sendAction: '发送行动',
    worldRecord: '世界记录',
    worldData: '世界资料',
    closeWorldData: '关闭世界资料',
    close: '关闭',
    vitality: '活力',
    stress: '压力',
    here: '此处',
    currentObjective: '当前目标',
    warmer: '关系升温',
    colder: '关系转冷',
    system: '系统',
    segmentSaved: '第 {n} 段 · 状态已自动保存',
    restoring: '正在恢复上次的对话',
    newContent: '有新内容',
    actionWritten: '行动已写入世界',
    aigramUnavailable: 'AI 世界暂时没有回应。你的行动和数值都没有被提交，请重试。',
    demoComplete: '模板演示内容已经走完。请使用正式 Aigram AI 世界继续故事。',
    remoteMissing: '缺少 chat_id，远程世界只能在已创建的游戏会话中使用。',
    remoteUnavailableError: '世界接口暂不可用（{n}）',
    remoteEmpty: '世界接口没有返回可保存的剧情内容。',
    worldResponding: '世界正在回应',
    checkingState: '核对人物与数值',
    checkSuccess: '成功',
    checkFailure: '失败',
    arrived: '抵达：{name}',
    gained: '获得',
    lost: '失去',
    joined: '加入了同行者',
    left: '离开了同行者',
    unknownAbility: '未知能力',
    chapterPaused: '本段旅程告一段落',
    you: '你',
    protagonist: '故事主角',
    playerAvatarAlt: '{name}的头像',
  },
  en: {
    folio: 'ALTERU · WORLD FOLIO 02',
    kicker: 'A conversational world that remembers people and choices',
    world: 'World',
    textSize: 'Text size',
    textSizeSmall: 'Small',
    textSizeStandard: 'Standard',
    textSizeLarge: 'Large',
    audioEnable: 'Enable sound',
    audioMute: 'Mute sound',
    audioUnavailable: 'Synthesized audio is unavailable on this device',
    stats: 'Current world values',
    imageAlt: 'Story scene: {name}',
    imageFailedAria: 'Scene image generation failed',
    imageGeneratingAria: 'Scene image is being generated',
    imageIdle: 'Waiting to record the scene',
    imageQueued: 'Added to the illustration queue',
    imageGenerating: 'Recording the scene — you may keep playing',
    imageFailed: 'Scene record failed',
    imageReady: 'Scene record archived',
    retry: 'Retry',
    retryAction: 'Retry this action',
    summary: 'Chapter note · saved',
    notEnding: 'This is not the ending. You can continue from here.',
    yourAction: 'Your action',
    demoFallback: 'Continue offline',
    aigramFallback: 'Use Aigram AI',
    reply: 'Reply',
    customAction: 'Custom action',
    sendAction: 'Send action',
    worldRecord: 'WORLD RECORD',
    worldData: 'World record',
    closeWorldData: 'Close world record',
    close: 'Close',
    vitality: 'Vitality',
    stress: 'Stress',
    here: 'Here',
    currentObjective: 'Current objective',
    warmer: 'Relationship warming',
    colder: 'Relationship cooling',
    system: 'System',
    segmentSaved: 'Segment {n} · state saved automatically',
    restoring: 'Restoring your last conversation',
    newContent: 'New content',
    actionWritten: 'Action entered into the world',
    aigramUnavailable: 'The AI world did not respond. Your action and values were not committed; please retry.',
    demoComplete: 'The finite template demo ends here. Use the Aigram AI world to continue the story.',
    remoteMissing: 'Missing chat_id. The persistent world requires an existing game session.',
    remoteUnavailableError: 'The world service is unavailable ({n}).',
    remoteEmpty: 'The world service returned no saveable story content.',
    worldResponding: 'The world is responding',
    checkingState: 'Checking characters and values',
    checkSuccess: 'Success',
    checkFailure: 'Failure',
    arrived: 'Arrived: {name}',
    gained: 'Gained',
    lost: 'Lost',
    joined: ' joined the party',
    left: ' left the party',
    unknownAbility: 'Unknown ability',
    chapterPaused: 'This chapter pauses here',
    you: 'You',
    protagonist: 'Story protagonist',
    playerAvatarAlt: "{name}'s avatar",
  },
} as const

export type TranslationKey = keyof typeof dictionary.zh

export function t(locale: Locale, key: TranslationKey, vars: Record<string, string | number> = {}): string {
  return String(dictionary[locale][key]).replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''))
}

export function detectLocale(): Locale {
  const query = new URLSearchParams(window.location.search).get('lang')
  if (query === 'zh' || query === 'en') return query
  const saved = localStorage.getItem('game_locale')
  if (saved === 'zh' || saved === 'en') return saved
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function detectTextLocale(text: string, current: Locale): Locale {
  if ((text.match(/[\u3400-\u9fff]/g) ?? []).length >= 2) return 'zh'
  if (/^\s*[A-Z][a-z]+\s*$/.test(text)) return current
  if (!/[\u3400-\u9fff]/.test(text) && /[A-Za-z]{3,}/.test(text)) return 'en'
  return current
}

export function rememberLocale(locale: Locale): void {
  localStorage.setItem('game_locale', locale)
}
