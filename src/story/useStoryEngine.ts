import { useCallback, useEffect, useRef, useState } from 'react'
import { useGenImage } from '../shared/runtime/useGenImage'
import { useGameSave } from '../shared/save/useGameSave'
import { aigramAdapter } from './adapters/aigram'
import { mockAdapter } from './adapters/mock'
import { remoteAdapter } from './adapters/remote'
import { resolveCartridge } from './cartridges'
import { applyParsedScene, createImageBlock, createInitialSave, localizeKnownState, updateImageBlock } from './engine/reducer'
import { parseStoryProtocol } from './engine/protocol'
import { t } from './i18n'
import type { AdapterProgress, Locale, StoryArchive, StoryCartridge, StoryMode, StorySave } from './types'

type LegacyStorySave = Omit<StorySave, 'version' | 'locale'> & {
  version?: 1 | 2 | 3 | 4
  locale?: Locale
  imageUrl?: string
  imageStatus?: 'idle' | 'queued' | 'generating' | 'ready' | 'failed'
  imagePrompt?: string
}

type PersistedStoryData = StoryArchive | LegacyStorySave

function isArchive(candidate: PersistedStoryData | null | undefined): candidate is StoryArchive {
  return Boolean(candidate && 'worlds' in candidate && candidate.worlds && typeof candidate.worlds === 'object')
}

function readLegacyLocal(cartridgeId: string): LegacyStorySave | null {
  try {
    const raw = localStorage.getItem(`stateful-story-${cartridgeId}-save`)
    return raw ? JSON.parse(raw) as LegacyStorySave : null
  } catch { return null }
}

function repairMockLoop(candidate: LegacyStorySave, cartridge: StoryCartridge): LegacyStorySave {
  const fallbackIndexes = new Set<number>()
  candidate.blocks.forEach((block, index) => {
    if (block.kind === 'narration' && /世界没有关闭，只是把新的线索推到下一页|world does not close; it carries a new clue onto the next page/i.test(block.text)) fallbackIndexes.add(index)
  })
  if (fallbackIndexes.size === 0) return candidate
  const blocks = candidate.blocks.filter((block, index) => !fallbackIndexes.has(index) && !(block.kind === 'event' && block.id.startsWith('action-') && fallbackIndexes.has(index + 1)))
  return { ...candidate, blocks, scene: Math.max(0, candidate.scene - fallbackIndexes.size), choices: [{ id: `recovered-${candidate.scene}`, label: cartridge.copy.continue }], sessionEnded: false, lastActionId: undefined }
}

function normalizeSave(candidate: LegacyStorySave | null | undefined, cartridge: StoryCartridge, incomingChatId?: string): StorySave {
  if (!candidate || candidate.cartridgeId !== cartridge.id || !Array.isArray(candidate.blocks)) return createInitialSave(cartridge, incomingChatId)
  if (incomingChatId && candidate.remoteChatId && candidate.remoteChatId !== incomingChatId) return createInitialSave(cartridge, incomingChatId)
  const repaired = repairMockLoop(candidate, cartridge)
  let blocks = repaired.blocks
  if (!blocks.some((block) => block.kind === 'image')) {
    const prompt = repaired.imagePrompt || cartridge.opening.imagePrompt
    const status = repaired.imageStatus === 'generating' ? 'queued' : repaired.imageStatus || (repaired.entered ? 'queued' : 'idle')
    blocks = [...blocks, createImageBlock(`image-${repaired.scene}`, repaired.location, prompt, status, repaired.imageUrl)]
  }
  return { ...repaired, version: 4, locale: repaired.locale ?? cartridge.locale, remoteChatId: incomingChatId || repaired.remoteChatId, blocks } as StorySave
}

export function useStoryEngine(cartridge: StoryCartridge, initialMode: StoryMode, incomingChatId?: string, imageIdentity: { ready: boolean; refUrl?: string } = { ready: true }) {
  const cloud = useGameSave<PersistedStoryData>('seventh-dock')
  const [save, setSave] = useState<StorySave>(() => createInitialSave(cartridge, incomingChatId))
  const [mode, setMode] = useState<StoryMode>(initialMode)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<AdapterProgress | null>(null)
  const [error, setError] = useState('')
  const [pendingAction, setPendingAction] = useState('')
  const [failedAction, setFailedAction] = useState<{ action: string; locale: Locale } | null>(null)
  const seeded = useRef(false)
  const imageAttempt = useRef('')
  const saveRef = useRef(save)
  const archiveRef = useRef<StoryArchive>({ version: 1, worlds: {} })
  const { generate } = useGenImage()
  const persist = cloud.persist

  useEffect(() => {
    if (!cloud.loaded || seeded.current) return
    seeded.current = true
    const stored = cloud.savedData
    const archive: StoryArchive = isArchive(stored)
      ? { ...stored, worlds: { ...stored.worlds } }
      : { version: 1, worlds: stored?.cartridgeId ? { [stored.cartridgeId]: stored as StorySave } : {} }
    const legacyLocal = archive.worlds[cartridge.id] ? null : readLegacyLocal(cartridge.id)
    const next = normalizeSave(archive.worlds[cartridge.id] as LegacyStorySave | undefined || legacyLocal, cartridge, incomingChatId)
    const nextArchive: StoryArchive = { ...archive, version: 1, worlds: { ...archive.worlds, [cartridge.id]: next } }
    archiveRef.current = nextArchive
    saveRef.current = next
    setSave(next)
    if (next.remoteChatId) {
      setMode('remote')
      const url = new URL(window.location.href)
      if (url.searchParams.get('chat_id') !== next.remoteChatId) {
        url.searchParams.set('chat_id', next.remoteChatId)
        window.history.replaceState({}, '', url)
      }
    }
    if (stored || legacyLocal || incomingChatId) persist(nextArchive)
  }, [cartridge, cloud.loaded, cloud.savedData, incomingChatId, persist])

  const commit = useCallback((recipe: StorySave | ((current: StorySave) => StorySave)) => {
    setSave((current) => {
      const next = typeof recipe === 'function' ? recipe(current) : recipe
      saveRef.current = next
      const archive = archiveRef.current
      const nextArchive: StoryArchive = { ...archive, version: 1, worlds: { ...archive.worlds, [cartridge.id]: next } }
      archiveRef.current = nextArchive
      persist(nextArchive)
      return next
    })
  }, [cartridge.id, persist])

  const queuedImage = [...save.blocks].reverse().find((block) => block.kind === 'image' && block.data?.status === 'queued')

  useEffect(() => {
    const prompt = String(queuedImage?.data?.prompt ?? '')
    if (!save.entered || !queuedImage || !prompt || !imageIdentity.ready || imageAttempt.current === queuedImage.id) return
    imageAttempt.current = queuedImage.id
    const key = queuedImage.id
    commit((current) => updateImageBlock(current, key, { status: 'generating' }))
    ;(async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const identityPrompt = imageIdentity.refUrl
            ? `${prompt}. Use the person in the reference image as the player protagonist in this scene. Preserve their recognizable facial features and overall appearance, while adapting clothing, pose, lighting, and camera distance naturally to this fictional world. Keep the environment and story event visually dominant; do not turn the scene into a selfie or portrait.`
            : prompt
          const url = await generate({ prompt: identityPrompt, ref_url: imageIdentity.refUrl })
          if (imageAttempt.current === key) commit((current) => updateImageBlock(current, key, { status: 'ready', url }))
          return
        } catch {
          if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, attempt === 0 ? 3000 : 8000))
        }
      }
      if (imageAttempt.current === key) commit((current) => updateImageBlock(current, key, { status: 'failed' }))
    })()
  }, [commit, generate, imageIdentity.ready, imageIdentity.refUrl, queuedImage, save.entered])

  const enter = useCallback(() => commit((current) => {
    const openingImage = current.blocks.find((block) => block.kind === 'image')
    const entered = { ...current, locale: cartridge.locale, entered: true }
    return openingImage && openingImage.data?.status === 'idle' ? updateImageBlock(entered, openingImage.id, { status: 'queued' }) : entered
  }), [cartridge.locale, commit])

  const act = useCallback(async (action: string, actionLocale: Locale = cartridge.locale) => {
    if (!action.trim() || busy) return
    const normalizedAction = action.trim()
    const activeCartridge = resolveCartridge(cartridge.id, actionLocale)
    setBusy(true); setError(''); setFailedAction(null); setPendingAction(normalizedAction); setProgress({ label: t(actionLocale, 'actionWritten'), percent: 8 })
    try {
      const adapter = mode === 'remote' ? remoteAdapter : mode === 'aigram' ? aigramAdapter : mockAdapter
      const base = localizeKnownState(saveRef.current, cartridge, activeCartridge)
      const result = await adapter.send(normalizedAction, { cartridge: activeCartridge, save: base, actionId: normalizedAction, locale: actionLocale }, setProgress)
      const parsed = parseStoryProtocol(result.content, actionLocale)
      commit((current) => applyParsedScene(localizeKnownState(current, cartridge, activeCartridge), parsed, activeCartridge, normalizedAction, result.imagePrompt))
      setPendingAction('')
      setProgress(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      setFailedAction({ action: normalizedAction, locale: actionLocale })
      setPendingAction('')
      setProgress(null)
    } finally { setBusy(false) }
  }, [busy, cartridge, commit, mode])

  const retryAction = useCallback(() => { if (failedAction) void act(failedAction.action, failedAction.locale) }, [act, failedAction])
  const useAigramFallback = useCallback(() => { setMode('aigram'); setError('') }, [])
  const continueAfterSummary = useCallback(() => commit((current) => ({ ...current, locale: cartridge.locale, sessionEnded: false, choices: [{ id: `continue-${current.scene}`, label: cartridge.copy.continue }] })), [cartridge, commit])
  const retryImage = useCallback((blockId: string) => { imageAttempt.current = ''; commit((current) => updateImageBlock(current, blockId, { status: 'queued' })) }, [commit])
  return { save, mode, setMode, busy, progress, error, pendingAction, canRetry: Boolean(failedAction), enter, act, retryAction, useAigramFallback, continueAfterSummary, retryImage, loaded: cloud.loaded && seeded.current, clear: cloud.clear }
}
