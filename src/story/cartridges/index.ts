import { seventhDock, seventhDockEn } from './seventhDock'
import type { Locale, StoryCartridge } from '../types'

export const DEFAULT_CARTRIDGE_ID = 'seventh-dock'

const localized: Record<Locale, StoryCartridge> = {
  zh: seventhDock,
  en: seventhDockEn,
}

export function listCartridges(locale: Locale): StoryCartridge[] { return [localized[locale]] }

export function resolveCartridge(_id: string | null | undefined, locale: Locale = 'zh'): StoryCartridge {
  return localized[locale]
}
