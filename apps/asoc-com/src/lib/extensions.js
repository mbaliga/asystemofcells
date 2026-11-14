// Build-time loader and helpers for the extension store.
// Reads extensions/*/store.json (schema asoc-extension-store/1). Everything in
// those files is contributor text: it is only ever escaped (Astro does that for
// {expressions}) or passed through renderMarkdown() below, which escapes first.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const SCHEMA = 'asoc-extension-store/1'
const SAFE_SEG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
const STATUSES = ['official', 'community', 'fan-made']
const RISKS = ['low', 'medium', 'high']

export const STATUS_LABEL = { official: 'Official', community: 'Community', 'fan-made': 'Fan-made' }
export const STATUS_HELP = {
  official: 'Made by the app’s own maker.',
  community: 'Made by someone else and listed here after review. Not affiliated with any third-party app it works with.',
  'fan-made': 'An independent, unofficial project inspired by something else.',
}
export const RISK_LABEL = { low: 'Low risk', medium: 'Medium risk', high: 'High risk' }

/** Find the repo's extensions/ folder. The built module may live in a bundle, so walk up instead of trusting one relative path. */
function findExtensionsDir() {
  const starts = [path.dirname(fileURLToPath(import.meta.url)), process.cwd()]
  for (const start of starts) {
    let dir = start
    for (let i = 0; i < 12; i++) {
      const cand = path.join(dir, 'extensions')
      if (existsSync(path.join(cand, 'tools', 'build.mjs'))) return cand
      const up = path.dirname(dir)
      if (up === dir) break
      dir = up
    }
  }
  return null
}

const str = (v, max = 100000) => (typeof v === 'string' ? v.slice(0, max) : '')

function normalizeExtension(raw, app) {
  if (!raw || typeof raw !== 'object') return null
  const id = str(raw.id, 128)
  if (!SAFE_SEG.test(id)) return null
  const name = str(raw.name, 120).trim()
  if (!name) return null
  const perms = (Array.isArray(raw.permissions) ? raw.permissions : [])
    .filter((p) => p && typeof p === 'object' && str(p.id))
    .map((p) => ({
      id: str(p.id, 200),
      label: str(p.label, 200) || str(p.id, 200),
      // An unknown risk value is treated as the most cautious one.
      risk: RISKS.includes(p.risk) ? p.risk : 'high',
      summary: str(p.summary, 600),
    }))
  const maxRisk = perms.reduce((m, p) => (RISKS.indexOf(p.risk) > RISKS.indexOf(m) ? p.risk : m), 'low')
  const status = STATUSES.includes(raw.status) ? raw.status : 'community'
  return {
    id,
    app: app.slug,
    appName: app.name,
    name,
    version: str(raw.version, 40),
    author: str(raw.author, 120),
    summary: str(raw.summary, 400),
    category: str(raw.category, 40).toLowerCase() || 'other',
    tags: (Array.isArray(raw.tags) ? raw.tags : []).map((t) => str(t, 40)).filter(Boolean).slice(0, 20),
    status,
    noncommercial: raw.noncommercial === true,
    license: str(raw.license, 80),
    minAppVersionCode: Number.isInteger(raw.minAppVersionCode) ? raw.minAppVersionCode : null,
    homepage: httpsOnly(raw.homepage),
    permissions: perms,
    maxRisk,
    icon: typeof raw.icon === 'string' ? raw.icon : null,
    screenshots: (Array.isArray(raw.screenshots) ? raw.screenshots : []).filter((s) => typeof s === 'string').slice(0, 12),
    readme: str(raw.readme, 200000),
    changelog: (Array.isArray(raw.changelog) ? raw.changelog : [])
      .filter((c) => c && typeof c === 'object')
      .map((c) => ({ version: str(c.version, 40), notes: (Array.isArray(c.notes) ? c.notes : []).map((n) => str(n, 2000)).filter(Boolean) })),
    package: httpsOnly(raw.package),
    size: Number.isFinite(raw.size) ? raw.size : null,
    sha256: /^[0-9a-f]{64}$/.test(str(raw.sha256, 64)) ? raw.sha256 : '',
  }
}

function httpsOnly(u) {
  const s = str(u, 2000)
  return /^https:\/\/[^\s"'<>]+$/.test(s) ? s : ''
}

let cache = null

/** { apps: [{slug,name,updated,count}], extensions: [...] }. Never throws. */
export function loadStore() {
  if (cache) return cache
  const result = { apps: [], extensions: [] }
  const root = findExtensionsDir()
  if (!root) {
    console.warn('[extensions] extensions/ folder not found; the store will be empty')
    return (cache = result)
  }
  const seen = new Set()
  let dirs = []
  try {
    dirs = readdirSync(root).filter((d) => {
      try { return statSync(path.join(root, d)).isDirectory() } catch { return false }
    }).sort()
  } catch (e) {
    console.warn(`[extensions] cannot read ${root}: ${e.message}`)
  }
  for (const d of dirs) {
    const file = path.join(root, d, 'store.json')
    if (!existsSync(file)) continue
    try {
      const data = JSON.parse(readFileSync(file, 'utf8'))
      if (!data || data.schema !== SCHEMA) throw new Error(`schema is not ${SCHEMA}`)
      const slug = str(data.app?.slug, 64)
      if (!SAFE_SEG.test(slug)) throw new Error('app.slug missing or unsafe')
      if (seen.has(slug)) throw new Error(`duplicate app slug ${slug}`)
      const app = { slug, name: str(data.app?.name, 80) || slug, updated: str(data.updated, 40), dir: d }
      const exts = (Array.isArray(data.extensions) ? data.extensions : [])
        .map((e) => normalizeExtension(e, app))
        .filter(Boolean)
      const ids = new Set()
      const uniq = exts.filter((e) => (ids.has(e.id) ? false : (ids.add(e.id), true)))
      seen.add(slug)
      result.apps.push({ slug, name: app.name, updated: app.updated, dir: d, count: uniq.length })
      result.extensions.push(...uniq)
    } catch (e) {
      console.warn(`[extensions] skipping ${file}: ${e.message}`)
    }
  }
  result.extensions.sort((a, b) => a.name.localeCompare(b.name))
  result.root = root
  return (cache = result)
}

/** Local file for an asset URL that points into this repo's extensions/ folder, else null. Nothing is hotlinked at runtime. */
export function localAsset(url) {
  if (typeof url !== 'string') return null
  const m = /^https:\/\/raw\.githubusercontent\.com\/mbaliga\/asystemofcells\/[^/]+\/extensions\/(.+)$/.exec(url)
  if (!m) return null
  const { root } = loadStore()
  if (!root) return null
  const full = path.resolve(root, decodeURIComponent(m[1]))
  if (!full.startsWith(path.resolve(root) + path.sep)) return null
  try { return statSync(full).isFile() ? full : null } catch { return null }
}

export const iconHref = (e) => (localAsset(e.icon) ? `/extensions/${e.app}/${e.id}/icon.png` : null)
export const screenshotHrefs = (e) =>
  e.screenshots.map((u, i) => (localAsset(u) ? { src: `/extensions/${e.app}/${e.id}/shot-${i}.png`, n: i } : null)).filter(Boolean)

export function formatSize(n) {
  if (!Number.isFinite(n) || n == null) return ''
  return n < 1024 ? `${n} bytes` : `${(n / 1024).toFixed(1)} KB`
}

export function categoryLabel(c) {
  return c.charAt(0).toUpperCase() + c.slice(1).replace(/[-_]/g, ' ')
}

// ---------------------------------------------------------------------------
// Small Markdown renderer. Escapes ALL input first; emits only: h3-h6 (readme
// headings are pushed down two levels), p, ul, ol, li, blockquote, pre, code,
// table/thead/tbody/tr/th/td, strong, em, a (http/https only, rel set).
// No raw HTML ever passes through, and images are not rendered.
// ---------------------------------------------------------------------------
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c])

export function renderInline(text) {
  const codes = []
  let s = escapeHtml(String(text).replace(/\u0000/g, ''))
  s = s.replace(/`([^`\n]+)`/g, (_, c) => `\u0000${codes.push(`<code>${c}</code>`) - 1}\u0000`)
  // images: drop the picture, keep the alt text as plain text
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]*)\)/g, '$1')
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) =>
    /^https?:\/\/[^\s\u0000]+$/i.test(href)
      ? `\u0000${codes.push(`<a href="${href}" rel="noopener noreferrer">${label.replace(/\u0000(\d+)\u0000/g, (_m, k) => codes[+k])}</a>`) - 1}\u0000`
      : label)
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>')
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[+i])
}

const isTableSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l) && l.includes('-')
const splitRow = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
const LIST_RE = /^\s*(?:[-*+]|\d+\.)\s+(.*)$/
const isBlockStart = (l) => /^\s*```/.test(l) || /^#{1,6}\s/.test(l) || LIST_RE.test(l) || /^\s*>/.test(l)

export function renderMarkdown(src) {
  const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n')
  const out = []
  let i = 0
  let first = true
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    let m
    if (/^\s*```/.test(line)) {
      const buf = []
      i++
      while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++])
      i++
      out.push(`<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`)
    } else if ((m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line))) {
      // The page already has an h1 (the name) and h2 sections, so the README's own first h1 is dropped.
      if (!(first && m[1].length === 1)) {
        const lvl = Math.min(6, m[1].length + 2)
        out.push(`<h${lvl}>${renderInline(m[2])}</h${lvl}>`)
      }
      i++
    } else if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = splitRow(line)
      i += 2
      const rows = []
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) rows.push(splitRow(lines[i++]))
      out.push(
        `<div class="ext-table-wrap" tabindex="0" role="region" aria-label="Table"><table><thead><tr>${head.map((c) => `<th scope="col">${renderInline(c)}</th>`).join('')}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`,
      )
    } else if (LIST_RE.test(line)) {
      const ordered = /^\s*\d+\./.test(line)
      const items = []
      while (i < lines.length && (m = LIST_RE.exec(lines[i])) && /^\s*\d+\./.test(lines[i]) === ordered) {
        let text = m[1]
        i++
        while (i < lines.length && lines[i].trim() && /^\s+\S/.test(lines[i]) && !LIST_RE.test(lines[i])) text += ' ' + lines[i++].trim()
        items.push(`<li>${renderInline(text)}</li>`)
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`)
    } else if (/^\s*>/.test(line)) {
      const buf = []
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''))
      out.push(`<blockquote><p>${renderInline(buf.join(' '))}</p></blockquote>`)
    } else {
      const buf = []
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) buf.push(lines[i++].trim())
      if (!buf.length) { buf.push(line.trim()); i++ }
      out.push(`<p>${renderInline(buf.join(' '))}</p>`)
    }
    first = false
  }
  return out.join('\n')
}
