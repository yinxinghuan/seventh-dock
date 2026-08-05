import type { ImageBlockStatus, ParsedScene, StoryBlock, StoryCartridge, StorySave } from '../types'
import { t } from '../i18n'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function createInitialSave(cartridge: StoryCartridge, remoteChatId?: string): StorySave {
  return {
    version: 4, cartridgeId: cartridge.id, locale: cartridge.locale, remoteChatId, entered: false, scene: 0,
    location: cartridge.opening.location, time: cartridge.opening.time, objective: cartridge.opening.objective,
    stats: Object.fromEntries(cartridge.statDefinitions.map((stat) => [stat.id, stat.initial])),
    blocks: [...cartridge.opening.blocks, createImageBlock('image-0', cartridge.opening.location, cartridge.opening.imagePrompt, 'idle')],
    choices: cartridge.opening.choices, map: cartridge.initialMap,
    inventory: cartridge.initialInventory, relationships: [],
    sessionEnded: false,
  }
}

export function createImageBlock(id: string, location: string, prompt: string, status: ImageBlockStatus, url = ''): StoryBlock {
  return { id, kind: 'image', text: location, data: { prompt, status, url } }
}

export function updateImageBlock(save: StorySave, blockId: string, patch: { status?: ImageBlockStatus; url?: string }): StorySave {
  return {
    ...save,
    blocks: save.blocks.map((block) => block.id === blockId && block.kind === 'image'
      ? { ...block, data: { ...block.data, ...patch } }
      : block),
  }
}

export function localizeKnownState(save: StorySave, from: StoryCartridge, to: StoryCartridge): StorySave {
  if (from.locale === to.locale) return save
  const sourceNodeByLabel = new Map(from.initialMap.map((node) => [node.label, node.id]))
  const targetNodeById = new Map(to.initialMap.map((node) => [node.id, node]))
  const map = save.map.map((node) => {
    const target = targetNodeById.get(node.id)
    const connectedId = node.connectedTo ? sourceNodeByLabel.get(node.connectedTo) : undefined
    return target ? { ...node, label: target.label, connectedTo: connectedId ? targetNodeById.get(connectedId)?.label : node.connectedTo } : node
  })
  const locationId = sourceNodeByLabel.get(save.location)
  const openingLocation = save.location === from.opening.location ? to.opening.location : undefined
  const inventoryById = new Map(to.initialInventory.map((item) => [item.id, item]))
  return {
    ...save,
    locale: to.locale,
    location: openingLocation ?? (locationId ? targetNodeById.get(locationId)?.label ?? save.location : save.location),
    time: save.time === from.opening.time ? to.opening.time : save.time,
    objective: save.objective === from.opening.objective ? to.opening.objective : save.objective,
    map,
    inventory: save.inventory.map((item) => inventoryById.has(item.id) ? { ...item, label: inventoryById.get(item.id)!.label } : item),
  }
}

function changeBlock(id: string, text: string, data?: Record<string, string | number>): StoryBlock {
  return { id, kind: 'change', text, data }
}

export function applyParsedScene(
  save: StorySave,
  parsed: ParsedScene,
  cartridge: StoryCartridge,
  actionId: string,
  imagePrompt?: string,
): StorySave {
  const next: StorySave = {
    ...save, locale: cartridge.locale, scene: save.scene + 1,
    blocks: [...save.blocks, { id: `action-${save.scene + 1}`, kind: 'event', text: actionId }, ...parsed.blocks],
    choices: [], relationships: [...save.relationships],
    map: save.map.map((node) => ({ ...node })), inventory: save.inventory.map((item) => ({ ...item })),
    stats: { ...save.stats },
    sessionEnded: false, lastActionId: actionId,
  }
  const effects: StoryBlock[] = []

  parsed.commands.forEach((command, index) => {
    const effectId = `effect-${next.scene}-${index}`
    if (command.type === 'choices') next.choices = command.choices.map((label, choiceIndex) => ({ id: `${next.scene}-${choiceIndex}`, label }))
    if (command.type === 'widget') {
      const definition = cartridge.statDefinitions.find((stat) => stat.id === command.id)
      if (!definition) return
      const current = next.stats[command.id] ?? definition.initial
      const raw = Number(command.value)
      const value = command.operation === 'add' ? current + raw : command.operation === 'remove' ? current - raw : raw
      next.stats[command.id] = clamp(value, definition.min, definition.max)
      const delta = next.stats[command.id] - current
      effects.push(changeBlock(effectId, `${definition.label} ${delta > 0 ? '+' : ''}${delta}`, { stat: command.id, delta }))
    }
    if (command.type === 'skill_check') {
      effects.push({ id: effectId, kind: 'check', text: `${command.skill} · ${command.result === 'success' ? t(cartridge.locale, 'checkSuccess') : t(cartridge.locale, 'checkFailure')}`, data: { dc: command.dc, roll: command.roll, modifier: command.modifier, total: command.total } })
    }
    if (command.type === 'state' && command.value) next.objective = command.value
    if (command.type === 'map_update') {
      next.map.forEach((node) => { node.current = false })
      const existing = next.map.find((node) => node.label === command.location || node.id === command.location)
      if (existing) existing.current = true
      else next.map.push({ id: `map-${next.scene}-${index}`, label: command.location, connectedTo: command.connectedTo, current: true })
      next.location = command.location
      effects.push({ id: effectId, kind: 'event', text: t(cartridge.locale, 'arrived', { name: command.location }) })
    }
    if (command.type === 'inventory') {
      const existing = next.inventory.find((item) => item.label === command.item || item.id === command.item)
      if (existing) existing.count = Math.max(0, existing.count + (command.action === 'add' ? command.count : -command.count))
      else if (command.action === 'add') next.inventory.push({ id: `item-${next.scene}-${index}`, label: command.item, count: command.count })
      next.inventory = next.inventory.filter((item) => item.count > 0)
      effects.push(changeBlock(effectId, `${command.action === 'add' ? t(cartridge.locale, 'gained') : t(cartridge.locale, 'lost')} ${command.item} ×${command.count}`))
    }
    if (command.type === 'reputation') {
      const delta = /betray|hostile|distrust|拒绝|背叛/i.test(command.action) ? -1 : 1
      next.relationships.push({ id: effectId, actor: command.npc, axis: command.action, delta, source: actionId })
      effects.push(changeBlock(effectId, `${command.npc} · ${delta > 0 ? t(cartridge.locale, 'warmer') : t(cartridge.locale, 'colder')}`, { delta }))
    }
    if (command.type === 'party_change') effects.push({ id: effectId, kind: 'event', text: `${command.character}${t(cartridge.locale, command.change === 'add' ? 'joined' : 'left')}` })
    if (command.type === 'session_end') {
      next.sessionEnded = true
      effects.push({ id: effectId, kind: 'summary', text: command.reason })
    }
  })

  next.blocks = [
    ...next.blocks,
    ...effects,
    ...(imagePrompt ? [createImageBlock(`image-${next.scene}`, next.location, imagePrompt, 'queued')] : []),
  ]
  if (!next.sessionEnded && next.choices.length === 0) next.choices = [{ id: `${next.scene}-continue`, label: cartridge.copy.continue }]
  return next
}
