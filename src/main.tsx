import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ui/styles/global.css'
import { App } from './ui/App.tsx'
import { browserLanguages, detectLang, loadCatalog } from './ui/i18n/index.ts'
import { listenForInstallPrompt } from './ui/pwa/pwa.ts'
import { loadPrefs, takeLanguageFromUrl } from './ui/state/prefs.ts'

listenForInstallPrompt()

// The top edge's band draws a hairline once the page scrolls under it (global.css, #50).
const markScrolled = () => {
  document.documentElement.toggleAttribute('data-scrolled', window.scrollY > 0)
}
window.addEventListener('scroll', markScrolled, { passive: true })

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

// A link from the landing page carries its language; keep the address bar tidy after.
const tidied = takeLanguageFromUrl(location.href)
if (tidied !== null) history.replaceState(history.state, '', tidied)

// Anonymous, cookieless page views, only in builds made on Vercel. Its script and endpoint
// are on this origin, so the CSP stays as it is; offline, the request just fails quietly.
if (__VERCEL_ANALYTICS__) {
  void import('@vercel/analytics').then(({ inject }) => inject({ framework: 'vite' }))
}

// Connect the chosen language's file before the first render.
const lang = loadPrefs().language ?? detectLang(browserLanguages())
void loadCatalog(lang)
  .catch(() => undefined)
  .finally(() =>
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
