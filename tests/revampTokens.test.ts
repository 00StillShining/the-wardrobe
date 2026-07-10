import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * WCAG contrast guarantees for the rebuild token system.
 * Parses src/revamp/styles/tokens.css so the checks track real values.
 */

const css = readFileSync(resolve(process.cwd(), 'src/revamp/styles/tokens.css'), 'utf8')

type Vars = Map<string, string>

function parseBlocks(source: string): { root: Vars; light: Vars; dark: Vars } {
  const root: Vars = new Map()
  const light: Vars = new Map()
  const dark: Vars = new Map()
  const blockRe = /([^{}]+)\{([^{}]*)\}/g
  for (const [, selector, body] of source.matchAll(blockRe)) {
    const target = selector.includes("data-surface='dark'")
      ? dark
      : selector.includes("data-surface='light'")
        ? light
        : selector.includes(':root')
          ? root
          : null
    if (!target) continue
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      target.set(name, value.trim())
    }
  }
  return { root, light, dark }
}

const { root, light, dark } = parseBlocks(css)

function resolveHex(name: string, context: Vars): string {
  let value = context.get(name) ?? root.get(name)
  assert.ok(value, `token ${name} is defined`)
  for (let hops = 0; hops < 5; hops++) {
    const ref = value!.match(/^var\((--[\w-]+)\)$/)
    if (!ref) break
    value = context.get(ref[1]) ?? root.get(ref[1])
    assert.ok(value, `token ${name} resolves (${ref[1]} missing)`)
  }
  const hex = value!.match(/#([0-9a-f]{6})\b/i)
  assert.ok(hex, `token ${name} resolves to a hex colour (got: ${value})`)
  return `#${hex![1]}`
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const linear = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrast(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a)
  return (hi + 0.05) / (lo + 0.05)
}

interface Pair {
  label: string
  fg: string
  bg: string
  min: number
}

const LIGHT_PAIRS: Pair[] = [
  { label: 'text on surface', fg: '--text', bg: '--surface', min: 4.5 },
  { label: 'text on raised surface', fg: '--text', bg: '--surface-raised', min: 4.5 },
  { label: 'muted text on surface', fg: '--text-muted', bg: '--surface', min: 4.5 },
  { label: 'muted text on raised surface', fg: '--text-muted', bg: '--surface-raised', min: 4.5 },
  { label: 'primary button label', fg: '--accent-ink', bg: '--accent', min: 4.5 },
  { label: 'danger button label', fg: '--danger-ink', bg: '--danger', min: 4.5 },
  { label: 'danger text on surface', fg: '--danger', bg: '--surface', min: 4.5 },
  { label: 'danger text on raised surface', fg: '--danger', bg: '--surface-raised', min: 4.5 },
  { label: 'focus ring on surface', fg: '--focus', bg: '--surface', min: 3 },
  { label: 'focus ring on raised surface', fg: '--focus', bg: '--surface-raised', min: 3 },
  { label: 'accent indicator line on surface', fg: '--accent-line', bg: '--surface', min: 3 },
  { label: 'control boundary on surface', fg: '--line-strong', bg: '--surface', min: 3 },
  { label: 'control boundary on raised surface', fg: '--line-strong', bg: '--surface-raised', min: 3 },
]

const DARK_PAIRS: Pair[] = [
  { label: 'text on surface', fg: '--text', bg: '--surface', min: 4.5 },
  { label: 'text on raised surface', fg: '--text', bg: '--surface-raised', min: 4.5 },
  { label: 'muted text on surface', fg: '--text-muted', bg: '--surface', min: 4.5 },
  { label: 'muted text on raised surface', fg: '--text-muted', bg: '--surface-raised', min: 4.5 },
  { label: 'primary button label', fg: '--accent-ink', bg: '--accent', min: 4.5 },
  { label: 'danger button label', fg: '--danger-ink', bg: '--danger', min: 4.5 },
  { label: 'focus ring on surface', fg: '--focus', bg: '--surface', min: 3 },
  { label: 'accent indicator line on surface', fg: '--accent-line', bg: '--surface', min: 3 },
  { label: 'control boundary on surface', fg: '--line-strong', bg: '--surface', min: 3 },
  { label: 'control boundary on raised surface', fg: '--line-strong', bg: '--surface-raised', min: 3 },
]

test('light-surface token pairs meet WCAG contrast', () => {
  for (const p of LIGHT_PAIRS) {
    const ratio = contrast(resolveHex(p.fg, light), resolveHex(p.bg, light))
    assert.ok(
      ratio >= p.min,
      `[light] ${p.label}: ${p.fg} on ${p.bg} = ${ratio.toFixed(2)}, needs ${p.min}`,
    )
  }
})

test('dark-surface token pairs meet WCAG contrast', () => {
  for (const p of DARK_PAIRS) {
    const ratio = contrast(resolveHex(p.fg, dark), resolveHex(p.bg, dark))
    assert.ok(
      ratio >= p.min,
      `[dark] ${p.label}: ${p.fg} on ${p.bg} = ${ratio.toFixed(2)}, needs ${p.min}`,
    )
  }
})

test('radius tokens respect the 8px ceiling (plan §6.5)', () => {
  for (const name of ['--radius-s', '--radius-m', '--radius-l']) {
    const value = root.get(name)
    assert.ok(value, `${name} defined`)
    const px = parseFloat(value!)
    assert.ok(px <= 8, `${name} = ${value} exceeds the 8px ceiling`)
  }
})
