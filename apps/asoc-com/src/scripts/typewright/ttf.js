// A small TrueType writer: glyf outlines of straight on-curve points, enough
// for the monoline font maker. Tables: head hhea maxp OS/2 hmtx cmap loca glyf
// name post. BMP codepoints only (cmap format 4). No dependencies.
import { bounds } from './outline.js'

const enc = (s) => { const b = new Uint8Array(s.length * 2); for (let i = 0; i < s.length; i++) { b[2 * i] = s.charCodeAt(i) >> 8; b[2 * i + 1] = s.charCodeAt(i) & 255 } return b }
const pad4 = (n) => (n + 3) & ~3

class W {
  constructor() { this.a = [] }
  u8(v) { this.a.push(v & 255); return this }
  u16(v) { this.a.push((v >> 8) & 255, v & 255); return this }
  i16(v) { return this.u16(v & 0xffff) }
  u32(v) { this.a.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255); return this }
  tag(t) { for (const c of t) this.a.push(c.charCodeAt(0)); return this }
  bytes(b) { for (const v of b) this.a.push(v); return this }
  zeros(n) { for (let i = 0; i < n; i++) this.a.push(0); return this }
  get length() { return this.a.length }
  done() { return Uint8Array.from(this.a) }
}

function checksum(b) {
  let sum = 0
  for (let i = 0; i < b.length; i += 4) sum = (sum + (((b[i] << 24) | ((b[i + 1] || 0) << 16) | ((b[i + 2] || 0) << 8) | (b[i + 3] || 0)) >>> 0)) >>> 0
  return sum
}

const psName = (s) => (String(s).replace(/[^A-Za-z0-9]/g, '') || 'Untitled').slice(0, 60)

/**
 * opts: { family, copyright, license, upm=1000, ascent=800, descent=-200, xHeight=500, capHeight=700,
 *         created (seconds since 1904, default now) }
 * glyphs: [{ cp, advance, contours }] (contours may be empty, e.g. space)
 */
export function buildTtf(opts, glyphs) {
  const upm = opts.upm || 1000, ascent = opts.ascent ?? 800, descent = opts.descent ?? -200
  const seen = new Set()
  for (const g of glyphs) {
    if (!Number.isInteger(g.cp) || g.cp < 0x20 || g.cp > 0xffff) throw new Error(`Codepoint U+${Number(g.cp).toString(16).toUpperCase()} is outside the Basic Multilingual Plane, which this maker supports.`)
    if (seen.has(g.cp)) throw new Error(`Duplicate glyph for U+${g.cp.toString(16).toUpperCase()}.`)
    seen.add(g.cp)
  }
  const sorted = glyphs.slice().sort((a, b) => a.cp - b.cp)
  const box = [[0, 0], [400, 0], [400, 700], [0, 700]]
  const notdef = { cp: -1, advance: 500, contours: [box.slice().reverse(), [[50, 50], [50, 650], [350, 650], [350, 50]].reverse().reverse()] }
  // outer clockwise, inner counter-clockwise: a hollow box
  notdef.contours = [[[0, 0], [0, 700], [400, 700], [400, 0]], [[50, 50], [350, 50], [350, 650], [50, 650]]]
  const all = [notdef, ...sorted]
  const n = all.length

  // glyf + loca
  const glyf = new W(), loca = [], metrics = []
  let maxPts = 0, maxCont = 0, gx0 = 0, gy0 = 0, gx1 = 0, gy1 = 0, minLsb = Infinity, minRsb = Infinity, maxExt = 0, advMax = 0
  for (const g of all) {
    loca.push(glyf.length)
    const b = bounds(g.contours)
    const adv = Math.max(0, Math.round(g.advance))
    advMax = Math.max(advMax, adv)
    if (!b) { metrics.push([adv, 0]); continue }
    const pts = g.contours.reduce((s, c) => s + c.length, 0)
    maxPts = Math.max(maxPts, pts); maxCont = Math.max(maxCont, g.contours.length)
    gx0 = Math.min(gx0, b.x0); gy0 = Math.min(gy0, b.y0); gx1 = Math.max(gx1, b.x1); gy1 = Math.max(gy1, b.y1)
    minLsb = Math.min(minLsb, b.x0); minRsb = Math.min(minRsb, adv - b.x1); maxExt = Math.max(maxExt, b.x1)
    metrics.push([adv, b.x0])
    const start = glyf.length
    glyf.i16(g.contours.length).i16(b.x0).i16(b.y0).i16(b.x1).i16(b.y1)
    let end = -1
    for (const c of g.contours) { end += c.length; glyf.u16(end) }
    glyf.u16(0)
    for (let i = 0; i < pts; i++) glyf.u8(1)
    let px = 0
    for (const c of g.contours) for (const [x] of c) { glyf.i16(x - px); px = x }
    let py = 0
    for (const c of g.contours) for (const [, y] of c) { glyf.i16(y - py); py = y }
    while ((glyf.length - start) % 4) glyf.u8(0)
  }
  loca.push(glyf.length)
  if (minLsb === Infinity) { minLsb = 0; minRsb = 0 }

  const locaT = new W(); loca.forEach((o) => locaT.u32(o))
  const hmtx = new W(); metrics.forEach(([a, l]) => hmtx.u16(a).i16(l))

  // cmap format 4
  const segs = []
  for (const g of sorted) {
    const gid = all.indexOf(g)
    const last = segs[segs.length - 1]
    if (last && g.cp === last.end + 1 && gid === last.gid0 + (last.end - last.start) + 1) last.end = g.cp
    else segs.push({ start: g.cp, end: g.cp, gid0: gid })
  }
  segs.push({ start: 0xffff, end: 0xffff, gid0: 0, last: true })
  const sc = segs.length
  let es = 0; while (1 << (es + 1) <= sc) es++
  const searchRange = (1 << es) * 2
  const f4 = new W().u16(4).u16(16 + sc * 8).u16(0).u16(sc * 2).u16(searchRange).u16(es).u16(sc * 2 - searchRange)
  segs.forEach((s) => f4.u16(s.end)); f4.u16(0)
  segs.forEach((s) => f4.u16(s.start))
  segs.forEach((s) => f4.u16(s.last ? 1 : (s.gid0 - s.start) & 0xffff))
  segs.forEach(() => f4.u16(0))
  const cmap = new W().u16(0).u16(1).u16(3).u16(1).u32(12).bytes(f4.done())

  // name
  const family = String(opts.family || 'Untitled').slice(0, 60)
  const ps = psName(family)
  const strs = [[1, family], [2, 'Regular'], [3, `${ps}-Regular;1.000`], [4, `${family} Regular`], [5, 'Version 1.000'], [6, `${ps}-Regular`]]
  if (opts.copyright) strs.unshift([0, String(opts.copyright).slice(0, 250)])
  if (opts.license) strs.push([13, String(opts.license).slice(0, 250)])
  strs.sort((a, b) => a[0] - b[0])
  const name = new W().u16(0).u16(strs.length).u16(6 + strs.length * 12)
  let off = 0; const blobs = strs.map(([, s]) => enc(s))
  strs.forEach(([id], i) => { name.u16(3).u16(1).u16(0x409).u16(id).u16(blobs[i].length).u16(off); off += blobs[i].length })
  blobs.forEach((b) => name.bytes(b))

  const head = new W().u32(0x00010000).u32(0x00010000).u32(0).u32(0x5f0f3cf5).u16(1).u16(upm)
  const t = opts.created ?? Math.floor(Date.now() / 1000) + 2082844800
  head.u32(0).u32(t).u32(0).u32(t).i16(gx0).i16(gy0).i16(gx1).i16(gy1).u16(0).u16(8).i16(2).i16(1).i16(0)
  const hhea = new W().u32(0x00010000).i16(ascent).i16(descent).i16(0).u16(advMax).i16(minLsb).i16(minRsb).i16(maxExt).i16(1).i16(0).i16(0).zeros(8).i16(0).u16(n)
  const maxp = new W().u32(0x00010000).u16(n).u16(maxPts).u16(maxCont).u16(0).u16(0).u16(1).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0)
  const cps = sorted.map((g) => g.cp)
  const os2 = new W().u16(4).i16(Math.round(metrics.reduce((s, m) => s + m[0], 0) / n)).u16(400).u16(5).u16(0)
  os2.i16(650).i16(600).i16(0).i16(75).i16(650).i16(600).i16(0).i16(350).i16(50).i16(300).i16(0).zeros(10).zeros(16)
  os2.tag('NONE').u16(0x40 | 0x80).u16(cps.length ? cps[0] : 0x20).u16(cps.length ? cps[cps.length - 1] : 0x20)
  os2.i16(ascent).i16(descent).i16(0).u16(Math.max(ascent, gy1)).u16(Math.max(-descent, -gy0)).u32(1).u32(0)
  os2.i16(opts.xHeight ?? 500).i16(opts.capHeight ?? 700).u16(0).u16(0x20).u16(1)
  const post = new W().u32(0x00030000).u32(0).i16(-100).i16(50).u32(0).u32(0).u32(0).u32(0).u32(0)

  const tables = { 'OS/2': os2.done(), cmap: cmap.done(), glyf: glyf.done(), head: head.done(), hhea: hhea.done(), hmtx: hmtx.done(), loca: locaT.done(), maxp: maxp.done(), name: name.done(), post: post.done() }
  const tags = Object.keys(tables).sort()
  const out = new W().u32(0x00010000).u16(tags.length)
  let sr = 1, e = 0; while (sr * 2 <= tags.length) { sr *= 2; e++ }
  out.u16(sr * 16).u16(e).u16(tags.length * 16 - sr * 16)
  let pos = 12 + tags.length * 16
  const dir = [], parts = []
  for (const tg of tags) {
    const data = tables[tg]
    dir.push({ tg, sum: checksum(data), pos, len: data.length })
    parts.push(data, new Uint8Array(pad4(data.length) - data.length))
    pos += pad4(data.length)
  }
  dir.forEach((d) => out.tag(d.tg).u32(d.sum).u32(d.pos).u32(d.len))
  const body = out.done()
  const total = new Uint8Array(pos)
  total.set(body, 0)
  let p = body.length
  for (const part of parts) { total.set(part, p); p += part.length }
  // head.checkSumAdjustment
  const hd = dir.find((d) => d.tg === 'head')
  const adj = (0xb1b0afba - checksum(total)) >>> 0
  new DataView(total.buffer).setUint32(hd.pos + 8, adj)
  return total
}
