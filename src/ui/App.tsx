import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Screen } from './components/Screen.tsx'
import { Toaster } from './components/Toaster.tsx'
import {
  browserLanguages,
  detectLang,
  I18nContext,
  LANGS,
  loadCatalog,
  loadedCatalog,
  translatorFor,
  type I18n,
  type Lang,
} from './i18n/index.ts'
import type { ScreenMotion } from './motion.ts'
import { openFixture } from './game/fixtureRoute.ts'
import { Game, type GameLayer } from './game/Game.tsx'
import { CombosSheet } from './game/Sheets.tsx'
import { Home } from './home/Home.tsx'
import { CaptainsLog } from './log/CaptainsLog.tsx'
import { NavContext, type Nav, type ScreenName } from './nav.ts'
import { InstallProvider } from './pwa/InstallProvider.tsx'
import { useSplash } from './pwa/pwa.ts'
import { Splash } from './pwa/Pwa.tsx'
import { usePwaToasts } from './pwa/usePwaToasts.tsx'
import { VoyageEnd } from './result/VoyageEnd.tsx'
import { Settings } from './settings/Settings.tsx'
import { PrefsContext, usePrefs, type PrefsApi } from './state/PrefsContext.ts'
import { loadPrefs, savePrefs, type Prefs } from './state/prefs.ts'
import { applyTheme } from './state/theme.ts'
import { useWakeLock } from './state/useWakeLock.ts'
import { NewVoyage } from './newVoyage/NewVoyage.tsx'
import { Setup } from './newVoyage/Setup.tsx'

/** The kit gallery for visual checks, `/?kit`: only on the dev server, never in a build. */
const KitGallery = import.meta.env.DEV
  ? lazy(() => import('./components/KitGallery.tsx').then((m) => ({ default: m.KitGallery })))
  : null

/**
 * The app shell: preferences (language, theme), translations and toasts around the current
 * screen. The screens come one issue at a time, from the design (~/Graphics/sail-automa.pen,
 * sections A to F); each adds its view to `View`.
 */
export function App() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const update = useCallback<PrefsApi['update']>(
    (change) =>
      setPrefs((prev) => {
        const next = { ...prev, ...change }
        savePrefs(next)
        return next
      }),
    [],
  )
  const prefsApi = useMemo<PrefsApi>(() => ({ prefs, update }), [prefs, update])

  // Auto follows the phone, live; day and night pin it.
  useEffect(() => {
    applyTheme(prefs.theme)
    if (prefs.theme !== 'auto' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('auto')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [prefs.theme])

  const preferred = prefs.language ?? detectLang(browserLanguages())
  // A language's file is loaded before it goes on screen, so text never flashes in English.
  const [lang, setLang] = useState<Lang>(() => (loadedCatalog(preferred) ? preferred : 'en'))
  useEffect(() => {
    if (lang === preferred) return
    let cancelled = false
    loadCatalog(preferred)
      .then(() => {
        if (!cancelled) setLang(preferred)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [lang, preferred])
  const i18n = useMemo<I18n>(
    () => ({ lang, t: translatorFor(lang), setLang: (language) => update({ language }) }),
    [lang, update],
  )
  useEffect(() => {
    document.documentElement.lang = LANGS.find((l) => l.code === lang)?.tag ?? lang
  }, [lang])

  // iOS Safari plays :active (the PRESS state) only once the page listens for touches.
  useEffect(() => {
    const noop = () => {}
    document.addEventListener('touchstart', noop, { passive: true })
    return () => document.removeEventListener('touchstart', noop)
  }, [])

  return (
    <PrefsContext.Provider value={prefsApi}>
      <I18nContext.Provider value={i18n}>
        <Toaster>
          <Shell />
        </Toaster>
      </I18nContext.Provider>
    </PrefsContext.Provider>
  )
}

interface Route {
  readonly screen: ScreenName
  readonly motion: ScreenMotion
  /** Counts navigations, so going to the same screen again still remounts it. */
  readonly n: number
}

/** Screens where a voyage is open, so the screen stays awake (design 00 → PWA checklist). */
const VOYAGE_SCREENS: readonly ScreenName[] = ['game']

const SCREENS: readonly ScreenName[] = [
  'home',
  'newVoyage',
  'setup',
  'game',
  'result',
  'log',
  'settings',
]

/**
 * Dev server only: `/?screen=setup` opens on a screen, for visual checks; `/?fixture=orderAttack`
 * (or `?script=x Yhh`) saves an engine fixture as the voyage and opens the game on it, and
 * `&layer=menu` opens a sheet on top (game/fixtureRoute.ts). Never in a build.
 */
function devScreen(): { screen: ScreenName; layer: GameLayer | null } | null {
  if (!import.meta.env.DEV) return null
  const fixture = openFixture(location.search)
  const name = new URLSearchParams(location.search).get('screen')
  const screen = SCREENS.find((s) => s === name) ?? (fixture ? 'game' : null)
  return screen ? { screen, layer: fixture?.layer ?? null } : null
}

function Shell() {
  // Every launch opens on Home without motion (board 03: moments never replay on a reload).
  const [dev] = useState(devScreen)
  const [route, setRoute] = useState<Route>(() => ({
    screen: dev?.screen ?? 'home',
    motion: 'none',
    n: 0,
  }))
  const { prefs } = usePrefs()
  const splash = useSplash()
  usePwaToasts()
  useWakeLock(prefs.wakeLock && VOYAGE_SCREENS.includes(route.screen))
  const nav = useMemo<Nav>(
    () => ({
      screen: route.screen,
      go: (screen, motion = 'fade') => setRoute((r) => ({ screen, motion, n: r.n + 1 })),
    }),
    [route.screen],
  )

  if (KitGallery && new URLSearchParams(location.search).has('kit'))
    return (
      <Suspense fallback={null}>
        <KitGallery />
      </Suspense>
    )

  return (
    <NavContext.Provider value={nav}>
      <InstallProvider offerOnce={route.screen === 'home' && splash === 'off'}>
        <Screen key={route.n} motion={route.motion}>
          <View screen={route.screen} layer={route.n === 0 ? (dev?.layer ?? null) : null} />
        </Screen>
      </InstallProvider>
      {splash === 'off' ? null : <Splash leaving={splash === 'leaving'} />}
    </NavContext.Provider>
  )
}

/** The view for each screen. Screens not built yet show Home. */
function View({ screen, layer }: { screen: ScreenName; layer: GameLayer | null }) {
  switch (screen) {
    case 'game':
      return <Game initialLayer={layer} />
    case 'newVoyage':
      return <NewVoyage />
    case 'setup':
      return <Setup />
    case 'result':
      return <VoyageEnd />
    case 'log':
      return <CaptainsLog />
    case 'settings':
      return <Settings />
    case 'home':
    default:
      return <HomeWithRules />
  }
}

/** Home, whose Rules and rulings row opens the combos (D6), as the game's dock does. */
function HomeWithRules() {
  const [rules, setRules] = useState(false)
  return (
    <>
      <Home onRules={() => setRules(true)} />
      {rules ? <CombosSheet onClose={() => setRules(false)} /> : null}
    </>
  )
}
