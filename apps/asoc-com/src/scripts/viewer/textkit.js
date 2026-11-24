// Small text helpers for the viewer. Pure functions.

export function parseCsv(text, delim = ',') {
  const rows = []
  let row = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++ } else q = false }
      else cell += c
    } else if (c === '"') q = true
    else if (c === delim) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows
}

export function toCsv(rows, delim = ',') {
  const esc = (v) => (new RegExp(`["\\n\\r${delim === '\t' ? '\\t' : delim}]`).test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  return rows.map((r) => r.map(esc).join(delim)).join('\n') + '\n'
}

/** { ok, text } or { ok:false, error } */
export function formatJson(text, indent = 2) {
  try { return { ok: true, text: JSON.stringify(JSON.parse(text), null, indent) + '\n' } }
  catch (e) { return { ok: false, error: e.message } }
}
export function minifyJson(text) {
  try { return { ok: true, text: JSON.stringify(JSON.parse(text)) } }
  catch (e) { return { ok: false, error: e.message } }
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
const unent = (s) => s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (m, g) => {
  if (g[0] === '#') { const n = g[1] === 'x' || g[1] === 'X' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m }
  return ENT[g] ?? m
})

/** Plain text from word/document.xml (docx) or content.xml (odt). Formatting is dropped. */
export function officeText(xml, kind) {
  const para = kind === 'odt' ? /<text:(?:p|h)\b[^>]*>([\s\S]*?)<\/text:(?:p|h)>/g : /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g
  const out = []
  let m
  while ((m = para.exec(xml))) {
    let inner = m[1]
    inner = inner.replace(/<w:tab\s*\/>|<text:tab\s*\/>/g, '\t').replace(/<w:br\s*\/>|<text:line-break\s*\/>/g, '\n')
    out.push(unent(inner.replace(/<[^>]+>/g, '')))
  }
  return out.join('\n')
}

export function hexDump(bytes, start = 0, length = 4096) {
  const lines = []
  const end = Math.min(bytes.length, start + length)
  for (let o = start; o < end; o += 16) {
    const chunk = bytes.subarray(o, Math.min(o + 16, end))
    const hex = [...chunk].map((v) => v.toString(16).padStart(2, '0')).join(' ').padEnd(47, ' ')
    const asc = [...chunk].map((v) => (v >= 32 && v < 127 ? String.fromCharCode(v) : '.')).join('')
    lines.push(`${o.toString(16).padStart(8, '0')}  ${hex}  ${asc}`)
  }
  return lines.join('\n')
}

export function humanSize(n) {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`
  return `${(n / 1073741824).toFixed(2)} GB`
}
