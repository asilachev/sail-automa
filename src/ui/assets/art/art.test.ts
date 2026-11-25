import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as art from './index.ts'

const here = (file: string) => fileURLToPath(new URL(file, import.meta.url))
// Vitest runs from the repo root (Vite would rewrite a `new URL('…/public/…')` as an asset)
const publicDir = (file: string) => join(process.cwd(), 'public', file)

const files = [
  'helm',
  'sym-helm',
  'sym-hk',
  'sym-tail',
  'sym-cannon',
  'ship',
  'tentacle',
  'cloud',
  'island',
  'sea-contours',
]

describe('the K3+ kit (issue #2)', () => {
  it.each(files)('%s.svg is a clean SVG with a viewBox, small enough to precache', (name) => {
    const svg = readFileSync(here(`${name}.svg`), 'utf8')
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[\d. -]+">/)
    // no editor metadata, comments, embedded images or scripts
    expect(svg).not.toMatch(/<metadata|<!--|inkscape|sodipodi|data-|<image|<script/)
    expect(svg.length).toBeLessThan(64 * 1024)
  })

  it('exports a URL for every drawing', () => {
    expect(Object.keys(art).sort()).toEqual(
      [
        'cloud',
        'helm',
        'island',
        'seaContours',
        'ship',
        'symCannon',
        'symHelm',
        'symHk',
        'symTail',
        'tentacle',
      ].sort(),
    )
    for (const url of Object.values(art)) expect(typeof url).toBe('string')
  })
})

describe('the icon set (pwa layer → Installable)', () => {
  it.each([
    'favicon.svg',
    'favicon.ico',
    'favicon-16x16.png',
    'favicon-32x32.png',
    'favicon-48x48.png',
    'apple-touch-icon.png',
    'pwa-192x192.png',
    'pwa-512x512.png',
    'pwa-1024x1024.png',
    'maskable-192x192.png',
    'maskable-512x512.png',
  ])('public/%s exists', (file) => {
    expect(existsSync(publicDir(file))).toBe(true)
  })
})
