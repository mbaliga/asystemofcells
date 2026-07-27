/*
 * Reads the house tokens out of packages/kit/src/styles/tokens.css at BUILD
 * time and returns them as data.
 *
 * The alternative was to transcribe the values into this app and keep them in
 * step by hand, which is the standard way design-system documentation starts
 * lying: the docs and the stylesheet drift, and nothing fails loudly when they
 * do. Parsing the stylesheet means the only way this page can be wrong is if
 * the stylesheet itself is wrong, in which case the page is correctly wrong.
 */
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const TOKENS_CSS = fileURLToPath(new URL('../../../../packages/kit/src/styles/tokens.css', import.meta.url))
const FONTS_CSS = fileURLToPath(new URL('../../../../packages/kit/src/styles/hyle-fonts.css', import.meta.url))

/** Every custom property declared in the first :root block, in source order. */
export function readTokens() {
  const css = fs.readFileSync(TOKENS_CSS, 'utf8')
  const root = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')))
  const out = []
  for (const line of root.split('\n')) {
    const m = line.match(/^\s*(--[\w-]+)\s*:\s*([^;]+);/)
    if (m) out.push({ name: m[1], value: m[2].trim() })
  }
  return out
}

/** The @font-face families actually declared, with their weights and files. */
export function readFaces() {
  const css = fs.readFileSync(FONTS_CSS, 'utf8')
  const faces = new Map()
  for (const block of css.split('@font-face').slice(1)) {
    const family = block.match(/font-family:\s*'([^']+)'/)?.[1]
    const file = block.match(/url\('([^']+)'\)/)?.[1]
    const weight = block.match(/font-weight:\s*(\d+)/)?.[1]
    if (!family) continue
    if (!faces.has(family)) faces.set(family, { family, weights: [] })
    faces.get(family).weights.push({ weight: Number(weight), file })
  }
  return [...faces.values()].map((f) => ({
    ...f,
    weights: f.weights.sort((a, b) => a.weight - b.weight),
  }))
}

/* ------------------------------------------------------------------ colour */

function parseColor(v) {
  const s = v.trim()
  let m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (m) {
    const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1]
    const n = parseInt(h, 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 }
  }
  m = s.match(/^rgba?\(([^)]+)\)$/i)
  if (m) {
    const p = m[1].split(',').map((x) => parseFloat(x))
    return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }
  }
  return null
}

export function isColor(value) {
  return parseColor(value) !== null
}

function relLum({ r, g, b }) {
  const f = (c) => {
    const x = c / 255
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/**
 * Contrast of `value` against `bg`, flattening any alpha over the background
 * first. Tokens like --ink-muted are translucent, and reporting their contrast
 * without compositing would overstate every one of them.
 */
export function contrastOn(value, bg = '#0b0b0c') {
  const fg = parseColor(value)
  const back = parseColor(bg)
  if (!fg || !back) return null
  const flat = {
    r: fg.r * fg.a + back.r * (1 - fg.a),
    g: fg.g * fg.a + back.g * (1 - fg.a),
    b: fg.b * fg.a + back.b * (1 - fg.a),
  }
  const l1 = relLum(flat)
  const l2 = relLum(back)
  const hi = Math.max(l1, l2)
  const lo = Math.min(l1, l2)
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
}

/** WCAG 2.1 verdict for normal-size body text. */
export function wcag(ratio) {
  if (ratio === null) return { label: 'n/a', pass: null }
  if (ratio >= 7) return { label: 'AAA', pass: true }
  if (ratio >= 4.5) return { label: 'AA', pass: true }
  if (ratio >= 3) return { label: 'AA large only', pass: 'partial' }
  return { label: 'fails', pass: false }
}

/** Group tokens the way the stylesheet itself is organised. */
export function groupTokens(tokens) {
  const groups = [
    { id: 'surface', title: 'Surface and ink', match: (n) => /^--(bg|surface|ink|hairline)/.test(n) },
    { id: 'accent', title: 'Accent', match: (n) => /^--(violet|cyan|grey)$/.test(n) },
    { id: 'provenance', title: 'Provenance', match: (n) => /^--provenance/.test(n) },
    { id: 'type', title: 'Type', match: (n) => /^--font/.test(n) },
    { id: 'form', title: 'Form and motion', match: (n) => /^--(radius|ease|motion)/.test(n) },
    { id: 'layout', title: 'Layout', match: (n) => /^--(shell|pad)$/.test(n) },
  ]
  const seen = new Set()
  const out = groups.map((g) => {
    const items = tokens.filter((t) => !seen.has(t.name) && g.match(t.name))
    items.forEach((t) => seen.add(t.name))
    return { ...g, items }
  })
  const rest = tokens.filter((t) => !seen.has(t.name))
  if (rest.length) out.push({ id: 'other', title: 'Other', items: rest })
  return out.filter((g) => g.items.length > 0)
}
