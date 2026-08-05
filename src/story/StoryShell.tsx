import { useEffect, useMemo, useRef, useState } from 'react'
import alteruMark from './img/alteru.svg'
import { DEFAULT_CARTRIDGE_ID, resolveCartridge } from './cartridges'
import { Icon, type IconName } from './Icons'
import { detectLocale, detectTextLocale, rememberLocale, t } from './i18n'
import type { DrawerId, ImageBlockStatus, Locale, StatDefinition, StoryBlock, StoryCartridge, StoryMode } from './types'
import { useStoryEngine } from './useStoryEngine'
import { usePlayerProfile, type PlayerProfile } from './usePlayerProfile'

function setCssTheme(cartridge: StoryCartridge): React.CSSProperties {
  return {
    '--st-outer': cartridge.theme.outer, '--st-surface': cartridge.theme.surface, '--st-paper': cartridge.theme.paper,
    '--st-ink': cartridge.theme.ink, '--st-muted': cartridge.theme.muted, '--st-accent': cartridge.theme.accent,
    '--st-danger': cartridge.theme.danger, '--st-gold': cartridge.theme.gold,
  } as React.CSSProperties
}

function Entry({ cartridge, onEnter, hasSave }: {
  cartridge: StoryCartridge; onEnter: () => void; hasSave: boolean
}) {
  return <main className={`st-entry st-entry--${cartridge.theme.material}`} style={setCssTheme(cartridge)}>
    <div className="st-entry__folio">{t(cartridge.locale, 'folio')}</div>
    <div className="st-entry__rule" />
    <p className="st-entry__kicker">{t(cartridge.locale, 'kicker')}</p>
    <h1>{cartridge.copy.title}</h1>
    <p className="st-entry__subtitle">{cartridge.copy.subtitle}</p>
    <figure className="st-entry__scene"><img src={cartridge.coverImage} alt="" draggable={false} /><span aria-hidden="true" /></figure>
    <p className="st-entry__promise">{cartridge.copy.promise}</p>
    <button className="st-primary" onPointerDown={onEnter}>{hasSave ? cartridge.copy.continue : cartridge.copy.enter}<Icon name="arrow" /></button>
    <div className="st-entry__brand"><img src={alteruMark} alt="" /> ALTERU</div>
  </main>
}

function statPresentation(stat: StatDefinition, value: number) {
  const span = Math.max(1, stat.max - stat.min)
  const ratio = Math.max(0, Math.min(1, (value - stat.min) / span))
  const warningAt = stat.warningAt ?? (stat.inverse ? stat.min + span * .25 : stat.min + span * .6)
  const dangerAt = stat.dangerAt ?? (stat.inverse ? stat.min + span * .1 : stat.min + span * .85)
  const danger = stat.inverse ? value <= dangerAt : value >= dangerAt
  const warning = stat.inverse ? value <= warningAt : value >= warningAt
  return {
    percent: Math.round(ratio * 100),
    thresholdPercent: Math.round(Math.max(0, Math.min(1, (warningAt - stat.min) / span)) * 100),
    tone: danger ? 'danger' : warning ? 'warning' : 'steady',
  }
}

function PlayerAvatar({ profile, locale, large = false }: { profile: PlayerProfile; locale: Locale; large?: boolean }) {
  const fallback = new URL('./alteru-default-avatar.jpg', document.baseURI).href
  return <span className={`st-player-avatar${large ? ' st-player-avatar--large' : ''}`} title={profile.name}>
    <img src={profile.avatarUrl} alt={large ? t(locale, 'playerAvatarAlt', { name: profile.name }) : ''} draggable={false} onError={(event) => { if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback }} />
  </span>
}

function ConversationHeader({ cartridge, engine, openWorld }: {
  cartridge: StoryCartridge; engine: ReturnType<typeof useStoryEngine>; openWorld: () => void
}) {
  return <header className="st-chat-header">
    <div className="st-chat-header__top">
      <div className="st-chat-header__identity">
        <div><span>{cartridge.copy.title}</span><i className={engine.mode === 'remote' ? 'is-live' : ''} /><img src={alteruMark} alt="" /></div>
        <small>{engine.save.location} · {engine.save.time}</small>
      </div>
      <button className="st-world-button" onClick={openWorld}><Icon name="book" /><span>{t(cartridge.locale, 'world')}</span></button>
    </div>
    <div className="st-chat-stats" aria-label={t(cartridge.locale, 'stats')}>
      {cartridge.statDefinitions.map((stat) => {
        const value = engine.save.stats[stat.id] ?? stat.initial
        const presentation = statPresentation(stat, value)
        return <div className={`st-chat-stat st-chat-stat--${stat.display ?? 'number'} is-${presentation.tone}`} key={stat.id}>
          <div className="st-chat-stat__reading"><span>{stat.label}</span><strong>{value}{stat.display === 'number' && <small> / {stat.max}</small>}</strong></div>
          {stat.display === 'bar' && <div className="st-chat-stat__track" role="progressbar" aria-label={stat.label} aria-valuemin={stat.min} aria-valuemax={stat.max} aria-valuenow={value}><i style={{ width: `${presentation.percent}%` }} /><b style={{ left: `${presentation.thresholdPercent}%` }} aria-hidden="true" /></div>}
        </div>
      })}
    </div>
  </header>
}

function InlineSceneImage({ block, cartridge, retry }: { block: StoryBlock; cartridge: StoryCartridge; retry: (id: string) => void }) {
  const status = String(block.data?.status ?? 'idle') as ImageBlockStatus
  const url = String(block.data?.url ?? '')
  return <figure className={`st-message-image st-message-image--${cartridge.theme.material} is-${status}`}>
    {url && status === 'ready'
      ? <img src={url} alt={t(cartridge.locale, 'imageAlt', { name: block.text })} draggable={false} />
      : <div className="st-message-image__placeholder" aria-label={t(cartridge.locale, status === 'failed' ? 'imageFailedAria' : 'imageGeneratingAria')}><img src={cartridge.coverImage} alt="" draggable={false} /><span aria-hidden="true" /></div>}
    <figcaption>
      <div><Icon name="image" /><span>{block.text}</span></div>
      <small>{t(cartridge.locale, status === 'idle' ? 'imageIdle' : status === 'queued' ? 'imageQueued' : status === 'generating' ? 'imageGenerating' : status === 'failed' ? 'imageFailed' : 'imageReady')}</small>
      {status === 'failed' && <button onClick={() => retry(block.id)}><Icon name="refresh" />{t(cartridge.locale, 'retry')}</button>}
    </figcaption>
  </figure>
}

function StoryBlockView({ block, cartridge, retryImage, player }: { block: StoryBlock; cartridge: StoryCartridge; retryImage: (id: string) => void; player: PlayerProfile }) {
  if (block.kind === 'image') return <InlineSceneImage block={block} cartridge={cartridge} retry={retryImage} />
  if (block.kind === 'dialogue') return <div className="st-message st-message--character"><div className="st-message__avatar">{block.speaker?.slice(0, 1)}</div><div className="st-message__body"><header><span>{block.speaker}</span><small>{block.tone}</small></header><p>{block.text}</p></div></div>
  if (block.kind === 'check') return <div className="st-result st-result--check"><div><span>{Number(block.data?.total) >= Number(block.data?.dc) ? 'PASS' : 'MISS'}</span><p>{block.text}</p></div><section><b>{block.data?.roll}</b><i>+</i><b>{block.data?.modifier}</b><i>=</i><strong>{block.data?.total}</strong><small>DC {block.data?.dc}</small></section></div>
  if (block.kind === 'change') return <div className="st-result st-result--change"><i /><span>{block.text}</span></div>
  if (block.kind === 'summary') return <section className="st-result st-result--summary"><small>{t(cartridge.locale, 'summary')}</small><h2>{block.text}</h2><p>{t(cartridge.locale, 'notEnding')}</p></section>
  if (block.kind === 'event' && block.id.startsWith('action-')) return <div className="st-message st-message--player"><div className="st-message__body"><small>{t(cartridge.locale, 'yourAction')}</small><p>{block.text}</p></div><PlayerAvatar profile={player} locale={cartridge.locale} /></div>
  if (block.kind === 'event') return <div className="st-system-line"><span>{block.text}</span></div>
  return <div className="st-narration"><p>{block.text}</p></div>
}

function ConversationFeed({ cartridge, engine, feedRef, endRef, onScroll, player }: {
  cartridge: StoryCartridge; engine: ReturnType<typeof useStoryEngine>;
  feedRef: React.RefObject<HTMLDivElement>; endRef: React.RefObject<HTMLDivElement>; onScroll: () => void; player: PlayerProfile
}) {
  return <div className="st-conversation" ref={feedRef} onScroll={onScroll}>
    <div className="st-conversation__day"><span>{engine.save.location}</span><small>{engine.save.objective}</small></div>
    {engine.save.blocks.map((block) => <StoryBlockView block={block} cartridge={cartridge} retryImage={engine.retryImage} player={player} key={block.id} />)}
    {engine.pendingAction && <div className="st-message st-message--player is-pending"><div className="st-message__body"><small>{t(cartridge.locale, 'yourAction')}</small><p>{engine.pendingAction}</p></div><PlayerAvatar profile={player} locale={cartridge.locale} /></div>}
    {engine.progress && <div className="st-typing"><span><i /><i /><i /></span><p>{engine.progress.label}</p></div>}
    {engine.error && <div className="st-inline-error"><p>{engine.error}</p>{engine.mode === 'remote' && <button onClick={() => engine.setMode('demo')}>{t(cartridge.locale, 'demoFallback')}</button>}</div>}
    <div className="st-conversation__end" ref={endRef} />
  </div>
}

function Composer({ cartridge, engine, onAct }: { cartridge: StoryCartridge; engine: ReturnType<typeof useStoryEngine>; onAct: (action: string) => void }) {
  const [custom, setCustom] = useState('')
  const repliesRef = useRef<HTMLDivElement>(null)
  useEffect(() => { repliesRef.current?.scrollTo({ left: 0, behavior: 'auto' }) }, [engine.save.scene])
  const submit = () => {
    const value = custom.trim()
    if (!value || engine.busy) return
    onAct(value); setCustom('')
  }
  const choices = engine.save.sessionEnded ? [{ id: `continue-${engine.save.scene}`, label: cartridge.copy.continue }] : engine.save.choices
  return <section className="st-composer" aria-label={t(cartridge.locale, 'reply')}>
    <div className="st-quick-replies" ref={repliesRef}>
      {choices.map((choice, index) => <button key={choice.id} disabled={engine.busy} onClick={() => engine.save.sessionEnded ? engine.continueAfterSummary() : onAct(choice.label)}><small>{String(index + 1).padStart(2, '0')}</small><span>{choice.label}</span><Icon name="arrow" /></button>)}
    </div>
    <form onSubmit={(event) => { event.preventDefault(); submit() }}>
      <Icon name="pen" />
      <input aria-label={t(cartridge.locale, 'customAction')} value={custom} onChange={(event) => setCustom(event.target.value)} placeholder={cartridge.copy.customAction} disabled={engine.busy || engine.save.sessionEnded} maxLength={160} />
      <button type="button" onPointerDown={submit} disabled={!custom.trim() || engine.busy || engine.save.sessionEnded} aria-label={t(cartridge.locale, 'sendAction')}><Icon name="arrow" /></button>
    </form>
  </section>
}

const drawerIcons: Record<DrawerId, IconName> = { party: 'people', map: 'map', inventory: 'bag', log: 'book' }

function WorldDrawer({ active, setActive, cartridge, engine, close, player }: {
  active: DrawerId; setActive: (id: DrawerId) => void; cartridge: StoryCartridge; engine: ReturnType<typeof useStoryEngine>; close: () => void; player: PlayerProfile
}) {
  const save = engine.save
  return <div className="st-drawer" role="dialog" aria-modal="true" aria-label={t(cartridge.locale, 'worldData')}><button className="st-drawer__scrim" onClick={close} aria-label={t(cartridge.locale, 'closeWorldData')} /><section>
    <header><div><small>{t(cartridge.locale, 'worldRecord')}</small><h2>{cartridge.copy.title}</h2></div><button onClick={close} aria-label={t(cartridge.locale, 'close')}><Icon name="close" /></button></header>
    <nav className="st-drawer-tabs">{(Object.keys(cartridge.drawerLabels) as DrawerId[]).map((id) => <button className={active === id ? 'is-active' : ''} onClick={() => setActive(id)} key={id}><Icon name={drawerIcons[id]} /><span>{cartridge.drawerLabels[id]}</span></button>)}</nav>
    {active === 'party' && <div className="st-roster"><article className="st-roster__player"><PlayerAvatar profile={player} locale={cartridge.locale} large /><div><h3>{player.name}</h3><p>{t(cartridge.locale, 'protagonist')}</p></div><strong>{t(cartridge.locale, 'you')}</strong></article>{cartridge.characters.map((character) => <article key={character.id}><div className="st-roster__initial">{character.name.slice(0, 1)}</div><div><h3>{character.name}</h3><p>{character.role}</p><small>{t(cartridge.locale, 'vitality')} {character.vitality} · {t(cartridge.locale, 'stress')} {character.stress}</small></div><ul>{character.skills.map((skill) => <li key={skill.id}>{skill.label}<b>+{skill.value}</b></li>)}</ul></article>)}</div>}
    {active === 'map' && <div className="st-map">{save.map.map((node, index) => <article className={node.current ? 'is-current' : ''} key={node.id}><small>{String(index + 1).padStart(2, '0')}</small><span>{node.label}</span>{node.current && <b>{t(cartridge.locale, 'here')}</b>}</article>)}</div>}
    {active === 'inventory' && <div className="st-inventory">{save.inventory.map((item) => <article key={item.id}><span>{item.label}</span><b>× {item.count}</b></article>)}</div>}
    {active === 'log' && <div className="st-log"><article><small>{t(cartridge.locale, 'currentObjective')}</small><p>{save.objective}</p></article>{save.relationships.map((event) => <article key={event.id}><small>{event.actor}</small><p>{event.axis} · {t(cartridge.locale, event.delta > 0 ? 'warmer' : 'colder')}</p></article>)}<article><small>{t(cartridge.locale, 'system')}</small><p>{t(cartridge.locale, 'segmentSaved', { n: save.scene + 1 })}</p></article></div>}
  </section></div>
}

function Game({ cartridge, mode, chatId, onLocaleChange }: { cartridge: StoryCartridge; mode: StoryMode; chatId?: string; onLocaleChange: (locale: Locale) => void }) {
  const player = usePlayerProfile()
  const engine = useStoryEngine(cartridge, mode, chatId, { ready: player.loaded, refUrl: player.imageRefUrl })
  const [worldOpen, setWorldOpen] = useState(false)
  const [worldTab, setWorldTab] = useState<DrawerId>('party')
  const [hasUnread, setHasUnread] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const follow = useRef(true)
  const hydratedLocale = useRef(false)
  const latestBlock = engine.save.blocks.at(-1)
  const latestImageStatus = latestBlock?.kind === 'image' ? String(latestBlock.data?.status ?? '') : ''

  useEffect(() => {
    if (!engine.loaded || hydratedLocale.current) return
    hydratedLocale.current = true
    const explicit = new URLSearchParams(window.location.search).get('lang')
    if (explicit !== 'zh' && explicit !== 'en' && engine.save.locale !== cartridge.locale) onLocaleChange(engine.save.locale)
  }, [cartridge.locale, engine.loaded, engine.save.locale, onLocaleChange])

  const scrollToLatest = (force = false) => {
    if (!force && !follow.current) { setHasUnread(true); return }
    requestAnimationFrame(() => {
      const node = feedRef.current
      node?.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
      setHasUnread(false)
    })
  }

  useEffect(() => { scrollToLatest(engine.busy || Boolean(engine.pendingAction)) }, [engine.busy, engine.pendingAction, engine.save.blocks.length, latestImageStatus])

  const onScroll = () => {
    const node = feedRef.current
    if (!node) return
    follow.current = node.scrollHeight - node.scrollTop - node.clientHeight < 140
    if (follow.current) setHasUnread(false)
  }

  const act = (action: string) => {
    const nextLocale = detectTextLocale(action, cartridge.locale)
    if (nextLocale !== cartridge.locale) onLocaleChange(nextLocale)
    follow.current = true
    engine.act(action, nextLocale)
    scrollToLatest(true)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setWorldOpen(false)
      if (event.key.toLowerCase() === 'w' && !(event.target instanceof HTMLInputElement)) setWorldOpen(true)
      const index = Number(event.key) - 1
      if (index >= 0 && index < engine.save.choices.length && !(event.target instanceof HTMLInputElement)) act(engine.save.choices[index].label)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [engine.save.choices, engine.busy])

  if (!engine.loaded) return <div className="st-loading" style={setCssTheme(cartridge)}><i /><span>{t(cartridge.locale, 'restoring')}</span></div>
  if (!engine.save.entered) return <Entry cartridge={cartridge} onEnter={engine.enter} hasSave={engine.save.scene > 0} />
  return <main className={`st-shell st-shell--${cartridge.theme.material}`} style={setCssTheme(cartridge)}>
    <ConversationHeader cartridge={cartridge} engine={engine} openWorld={() => setWorldOpen(true)} />
    <ConversationFeed cartridge={cartridge} engine={engine} feedRef={feedRef} endRef={endRef} onScroll={onScroll} player={player} />
    {hasUnread && <button className="st-new-content" onClick={() => { follow.current = true; scrollToLatest(true) }}>{t(cartridge.locale, 'newContent')}<Icon name="arrow" /></button>}
    <Composer cartridge={cartridge} engine={engine} onAct={act} />
    {worldOpen && <WorldDrawer active={worldTab} setActive={setWorldTab} cartridge={cartridge} engine={engine} close={() => setWorldOpen(false)} player={player} />}
  </main>
}

export default function StoryShell() {
  const [locale, setLocale] = useState<Locale>(() => detectLocale())
  const cartridge = useMemo(() => resolveCartridge(DEFAULT_CARTRIDGE_ID, locale), [locale])
  const chatId = new URLSearchParams(window.location.search).get('chat_id') || undefined
  const mode: StoryMode = chatId ? 'remote' : 'demo'
  useEffect(() => { document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en' }, [locale])
  const changeLocale = (next: Locale) => { rememberLocale(next); setLocale(next) }
  return <Game key={cartridge.id} cartridge={cartridge} mode={mode} chatId={chatId} onLocaleChange={changeLocale} />
}
