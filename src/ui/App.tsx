import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from './components/Button.tsx'
import { numeral } from './components/pieces.ts'
import { Screen } from './components/Screen.tsx'
import { Toaster } from './components/Toaster.tsx'
import { openFixture } from './game/fixtureRoute.ts'
import { Game, type GameLayer } from './game/Game.tsx'
import { Result } from './game/Result.tsx'
import {
  browserLanguages,
  detectLang,
  I18nContext,
  LANGS,
  loadCatalog,
  loadedCatalog,
  translatorFor,
  useT,
  type I18n,
  type Lang,
} from './i18n/index.ts'
import type { ScreenMotion } from './motion.ts'
import { NavContext, useNav, type Nav, type ScreenName } from './nav.ts'
import { PrefsContext, type PrefsApi } from './state/PrefsContext.ts'
import { loadPrefs, savePrefs, type Prefs } from './state/prefs.ts'
import { applyTheme } from './state/theme.ts'
import { useVoyage } from './state/useVoyage.ts'
import { useVoyageContext, VoyageContext } from './state/VoyageContext.ts'
import styles from './app.module.css'

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

function Shell() {
  // The dev-only fixture route, `/?fixture=orderAttack`: saves the fixture before the voyage
  // loads, and opens the game on it (game/fixtureRoute.ts). Never in a build.
  const [fixture] = useState<{ layer: GameLayer | null } | null>(() =>
    import.meta.env.DEV ? openFixture(location.search) : null,
  )
  const voyage = useVoyage()
  // Every launch opens on Home without motion (board 03: moments never replay on a reload).
  const [route, setRoute] = useState<Route>({
    screen: fixture ? 'game' : 'home',
    motion: 'none',
    n: 0,
  })
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
    <VoyageContext.Provider value={voyage}>
      <NavContext.Provider value={nav}>
        <Screen key={route.n} motion={route.motion}>
          <View screen={route.screen} gameLayer={route.n === 0 ? (fixture?.layer ?? null) : null} />
        </Screen>
      </NavContext.Provider>
    </VoyageContext.Provider>
  )
}

/** The view for each screen. Screens not built yet show Home. */
function View({ screen, gameLayer }: { screen: ScreenName; gameLayer: GameLayer | null }) {
  switch (screen) {
    case 'game':
      return <Game initialLayer={gameLayer} />
    case 'result':
      return <Result />
    case 'home':
    default:
      return <HomePlaceholder />
  }
}

/**
 * Stands in for Home (design A2) until its issue (#5) builds it: the wordmark, and Continue when
 * a voyage is saved, so the game (#7) can be reached.
 */
function HomePlaceholder() {
  const t = useT()
  const nav = useNav()
  const { voyage } = useVoyageContext()
  return (
    <main className={styles.shell} aria-label={t('app.name')}>
      <h1 className={styles.wordmark}>{t('app.wordmark')}</h1>
      <p className={styles.sub}>{t('app.sub')}</p>
      {voyage ? (
        <Button onClick={() => nav.go('game', 'push')}>
          {t('game.continue', { round: numeral(voyage.state.round) })}
        </Button>
      ) : null}
      <p className={styles.footer}>{t('home.footer')}</p>
    </main>
  )
}
