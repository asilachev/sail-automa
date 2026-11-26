import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const UI = join(import.meta.dirname, '..')

function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return cssFiles(path)
    return entry.name.endsWith('.css') ? [path] : []
  })
}

// global.css → The top edge (#50): iOS blurs about 40 pt below the status bar in the installed app.
describe('the top edge on the iPhone Home Screen (#50)', () => {
  const global = readFileSync(join(UI, 'styles', 'global.css'), 'utf8')

  it('keeps every screen below the blurred strip: screens pad by --top-inset', () => {
    const raw = cssFiles(UI).filter(
      (file) =>
        !file.endsWith('global.css') && readFileSync(file, 'utf8').includes('safe-area-inset-top'),
    )
    expect(raw).toEqual([])
  })

  it('adds the strip only in the installed iPhone app, in portrait', () => {
    expect(global).toMatch(/--edge-top: 0px;/)
    expect(global).toMatch(
      /@supports \(-webkit-touch-callout: none\) \{\s*@media \(display-mode: standalone\) and \(orientation: portrait\) \{\s*:root \{\s*--edge-top: 2\.5rem;/,
    )
  })

  it('covers the strip with a fixed band in the page colour', () => {
    const band = /body::before \{([^}]*)\}/.exec(global)?.[1] ?? ''
    expect(band).toMatch(/position: fixed;/)
    expect(band).toMatch(/top: 0;/)
    expect(band).toMatch(/height: var\(--top-inset\);/)
    expect(band).toMatch(/background: var\(--bg\);/)
  })
})
