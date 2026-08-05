import type { StoryAdapter } from '../types'
import { t } from '../i18n'

export const mockAdapter: StoryAdapter = {
  id: 'demo',
  async send(action, context, onProgress) {
    onProgress?.({ label: t(context.locale, 'worldResponding'), percent: 24 })
    await new Promise((resolve) => window.setTimeout(resolve, 360))
    const normalized = action.toLowerCase()
    const unused = context.cartridge.demoTurns.find((turn, index) => index >= context.save.scene && turn.match.some((keyword) => normalized.includes(keyword.toLowerCase())))
    const turn = unused ?? context.cartridge.demoTurns[context.save.scene]
    onProgress?.({ label: t(context.locale, 'checkingState'), percent: 68 })
    await new Promise((resolve) => window.setTimeout(resolve, 440))
    if (turn) return { content: turn.content, imagePrompt: turn.imagePrompt }
    return context.locale === 'en'
      ? { content: `You enter “${action}” into the journal. The world does not close; it carries a new clue onto the next page.\n[choices: "Follow the new clue"|"Check in with your companions"|"Return somewhere safe and review the record"]` }
      : { content: `你把“${action}”写进了这页手记。世界没有关闭，只是把新的线索推到下一页。\n[choices: "沿着新线索继续调查"|"先与同行者确认彼此的状态"|"回到安全地点整理记录"]` }
  },
}
