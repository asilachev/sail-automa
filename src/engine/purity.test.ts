import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const dir = fileURLToPath(new URL('.', import.meta.url))
const sources = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))

describe('engine purity (AGENTS.md → Ground rules)', () => {
  it.each(sources)('%s has no React, DOM, clock or randomness', (file) => {
    const code = readFileSync(`${dir}/${file}`, 'utf8')
    for (const banned of [
      /from ['"]react/,
      /\bdocument\./,
      /\bwindow\./,
      /\blocalStorage\b/,
      /\bDate\b/,
      /Math\.random/,
      /performance\.now/,
    ]) {
      expect(code, `${file}: ${banned}`).not.toMatch(banned)
    }
  })
})
