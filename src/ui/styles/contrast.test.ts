import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// #14: small text on the night surfaces keeps 4.5:1 (WCAG AA), large text and icons 3:1. The
// tokens come from global.css itself, so a token change that drops below fails here.
const css = readFileSync('src/ui/styles/global.css', 'utf8')
function tokens(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6,8})\b/gi)].map((m) => [
      m[1]!,
      m[2]!.toLowerCase(),
    ]),
  )
}

const night = tokens(css.slice(css.indexOf(":root[data-theme='night']")))
const autoNight = tokens(
  css.slice(
    css.indexOf('@media (prefers-color-scheme: dark)'),
    css.indexOf(":root[data-theme='night']"),
  ),
)

type Rgba = [number, number, number, number]
const rgba = (hex: string): Rgba => {
  const h = hex.slice(1)
  const a = h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), a]
}
const over = (top: Rgba, base: Rgba): Rgba => [
  top[0] * top[3] + base[0] * (1 - top[3]),
  top[1] * top[3] + base[1] * (1 - top[3]),
  top[2] * top[3] + base[2] * (1 - top[3]),
  1,
]
const luminance = ([r, g, b]: Rgba) => {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (fg: Rgba, bg: Rgba) => {
  const [a, b] = [luminance(fg), luminance(bg)]
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
const color = (name: string) => {
  const value = night[name]
  if (value === undefined) throw new Error(`no night token --${name}`)
  return rgba(value)
}

describe('night tokens (#14)', () => {
  it('match between the automatic and the pinned night theme', () => {
    expect(autoNight).toEqual(night)
  })

  const surfaces: Record<string, Rgba> = {
    bg: color('bg'),
    surface: color('surface'),
    // The play-area board (HUD): its gradient runs from play-2 to play; play-2 is the darker end.
    board: color('play-2'),
  }
  const cases: [text: string, on: string, base?: string][] = [
    ['text-1', 'bg'],
    ['text-1', 'surface'],
    ['text-2', 'bg'],
    ['text-2', 'surface'],
    ['text-3', 'bg'],
    ['text-3', 'surface'],
    ['accent-text', 'bg'],
    ['accent-text', 'surface'],
    // A ruling's pill: coral text on the coral tint of a card.
    ['accent-text', 'accent-soft', 'surface'],
    ['danger-text', 'bg'],
    ['danger-text', 'surface'],
    // A log tag and the Kraken's attack line: danger text on the danger tint.
    ['danger-text', 'danger-soft', 'surface'],
    ['gold-text', 'surface'],
    ['sky', 'surface'],
    ['board-navy', 'board'],
  ]
  it.each(cases)('small %s on %s keeps 4.5:1', (text, on, base) => {
    const background = base ? over(color(on), surfaces[base]!) : surfaces[on]!
    expect(ratio(color(text), background)).toBeGreaterThanOrEqual(4.5)
  })
})
