import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  define: {
    // Vercel Web Analytics only in builds that run on Vercel; other builds drop it entirely.
    __VERCEL_ANALYTICS__: JSON.stringify(process.env.VERCEL === '1'),
  },
  plugins: [
    react(),
    // Installable, offline-first PWA (design 00 → PWA checklist). The service worker precaches the whole build and
    // waits for RELOAD (prompt mode) instead of reloading mid-game.
    VitePWA({
      registerType: 'prompt',
      // The icon set comes from `npm run icons` (scripts/gen-icons.mjs, design board 05).
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
      // workbox.globPatterns already precaches the icons, minus the 1024 px one below.
      includeManifestIcons: false,
      manifest: {
        name: 'Bosun: a solo partner for Sail',
        short_name: 'Bosun',
        description:
          "A phone companion for Chuck Rosselli's Sail Solitaire: the Bosun plays the other side.",
        lang: 'en',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-1024x1024.png', sizes: '1024x1024', type: 'image/png' },
          { src: 'maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2,webmanifest}'],
        // The 1024 px icon is for stores and splash generators, not worth precaching (300 KB).
        globIgnores: ['**/pwa-1024x1024.png'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'engine',
          include: ['src/engine/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          include: ['src/ui/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['src/test/setup.ts'],
        },
      },
    ],
  },
})
