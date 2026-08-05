import { useCallback, useEffect, useRef, useState } from 'react'
import type { StoryCartridge, StorySave } from '../types'
import { StorySynth, type StoryAudioCue } from './StorySynth'

const AUDIO_MUTED_KEY = 'alteru_story_audio_muted'

function readMuted(): boolean {
  try { return localStorage.getItem(AUDIO_MUTED_KEY) === '1' } catch { return false }
}

function calculateTension(cartridge: StoryCartridge, save: StorySave): number {
  let value = 0
  let weights = 0
  cartridge.audioTheme.tension.forEach((source) => {
    const definition = cartridge.statDefinitions.find((stat) => stat.id === source.statId)
    if (!definition) return
    const span = Math.max(1, definition.max - definition.min)
    const normalized = Math.max(0, Math.min(1, ((save.stats[source.statId] ?? definition.initial) - definition.min) / span))
    value += (source.direction === 'low' ? 1 - normalized : normalized) * source.weight
    weights += source.weight
  })
  return weights > 0 ? value / weights : .25
}

export function useStoryAudio(cartridge: StoryCartridge, save: StorySave) {
  const synthRef = useRef<StorySynth | null>(null)
  if (!synthRef.current) synthRef.current = new StorySynth()
  const [muted, setMutedState] = useState(readMuted)
  const statSignature = cartridge.audioTheme.tension.map((source) => `${source.statId}:${save.stats[source.statId] ?? 0}`).join('|')

  useEffect(() => {
    synthRef.current?.configure(cartridge.audioTheme, calculateTension(cartridge, save))
  }, [cartridge, statSignature])

  useEffect(() => {
    synthRef.current?.setMuted(muted)
    try { localStorage.setItem(AUDIO_MUTED_KEY, muted ? '1' : '0') } catch { /* private storage can reject writes */ }
  }, [muted])

  useEffect(() => {
    const onVisibility = () => { void synthRef.current?.setPageVisible(!document.hidden) }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => () => synthRef.current?.dispose(), [])

  const unlock = useCallback(async () => synthRef.current?.unlock() ?? false, [])
  const cue = useCallback((name: StoryAudioCue) => {
    if (muted) return
    void (async () => {
      if (await synthRef.current?.unlock()) synthRef.current?.cue(name)
    })()
  }, [muted])
  const toggle = useCallback(() => setMutedState((current) => {
    const next = !current
    synthRef.current?.setMuted(next)
    if (!next) void synthRef.current?.unlock().then((ready) => { if (ready) synthRef.current?.cue('open') })
    return next
  }), [])

  return { muted, supported: synthRef.current.supported, unlock, cue, toggle }
}
