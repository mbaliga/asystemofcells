// Model parsers: STL (binary + ASCII), OBJ, 3MF. Pure, no DOM: runs in a Worker and under node --test.
// Output: Float32Array triangle soup in millimetres (9 floats per triangle).
import { parseBinarySTL, parseAsciiSTL } from './estimate.js'

export const MAX_BYTES = 100 * 1024 * 1024
export class ParseError extends Error {}

export function parseSTL(buf) {
  const dv = new DataView(buf)
  const declared = buf.byteLength >= 84 ? dv.getUint32(80, true) : -1
  if (declared >= 0 && 84 + declared * 50 === buf.byteLength) return parseBinarySTL(buf)
  const head = new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(buf.byteLength, 256)))
  if (!/^\s*solid/i.test(head) && !/facet|vertex/.test(head) && declared < 0) throw new ParseError('That does not look like an STL file.')
  const ascii = /^\s*solid/i.test(head) || /facet|vertex/.test(head) ? parseAsciiSTL(new TextDecoder().decode(buf)) : new Float32Array(0)
  if (ascii.length) return ascii
  // A binary file with trailing bytes, or a "solid" header, that is not ASCII: trust the count if the data is there.
  if (declared > 0 && 84 + declared * 50 <= buf.byteLength) return parseBinarySTL(buf.slice(0, 84 + declared * 50))
  throw new ParseError('The STL has no triangles.')
}

export function parseOBJ(buf) {
  const v = [], tris = []
  for (const line of new TextDecoder().decode(buf).split(/\r?\n/)) {
    if (line.startsWith('v ')) { const p = line.trim().split(/\s+/); v.push([+p[1], +p[2], +p[3]]) }
    else if (line.startsWith('f ')) {
      const idx = line.trim().split(/\s+/).slice(1).map((t) => { const i = parseInt(t, 10); return i < 0 ? v.length + i : i - 1 })
      for (let k = 1; k < idx.length - 1; k++) tris.push(idx[0], idx[k], idx[k + 1])
    }
  }
  if (!tris.length) throw new ParseError('The OBJ has no faces.')
  const out = new Float32Array(tris.length * 3)
  tris.forEach((i, k) => { const p = v[i]; if (!p) throw new ParseError('The OBJ refers to a vertex that is not there.'); out.set(p, k * 3) })
  return out
}

// ---- 3MF: a ZIP holding 3D/3dmodel.model -------------------------------------------------

const MAX_UNPACKED = 400 * 1024 * 1024 // a 100 MB archive must not unpack to gigabytes (zip bomb) or past V8's string limit

async function inflateRaw(bytes, cap = MAX_UNPACKED) {
  const r = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader()
  const parts = []; let n = 0
  for (;;) {
    const { done, value } = await r.read()
    if (done) break
    n += value.length
    if (n > cap) { r.cancel(); throw new ParseError('That 3MF is too large once unpacked.') }
    parts.push(value)
  }
  const out = new Uint8Array(n); let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return out
}

/** Minimal ZIP reader (central directory). Returns { name -> Uint8Array } for the entries asked for. */
export async function unzip(buf, want) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf)
  const off0 = (p) => dv.getUint32(p + 42, true)
  let eocd = -1
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  if (eocd < 0) throw new ParseError('That 3MF is not a valid archive.')
  const count = dv.getUint16(eocd + 10, true)
  let p = dv.getUint32(eocd + 16, true)
  const out = {}
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new ParseError('That 3MF archive is damaged.')
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), usize = dv.getUint32(p + 24, true)
    if (csize === 0xffffffff || usize === 0xffffffff || off0(p) === 0xffffffff) throw new ParseError('That 3MF uses ZIP64, which is not supported here.')
    const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true)
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nlen))
    if (want(name)) {
      if (usize > MAX_UNPACKED) throw new ParseError('That 3MF is too large once unpacked.')
      const lnlen = dv.getUint16(off + 26, true), lelen = dv.getUint16(off + 28, true)
      const data = u8.subarray(off + 30 + lnlen + lelen, off + 30 + lnlen + lelen + csize)
      out[name] = method === 0 ? data : method === 8 ? await inflateRaw(data) : (() => { throw new ParseError('That 3MF uses an unsupported compression.') })()
    }
    p += 46 + nlen + elen + clen
  }
  return out
}

const attr = (tag, name) => { const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag); return m ? m[1] : null }
const UNIT_MM = { micron: 0.001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 }
const mat = (s) => { // 3MF transform: 12 numbers, row-vector convention (x' = x*m00 + y*m10 + z*m20 + m30)
  const m = (s || '1 0 0 0 1 0 0 0 1 0 0 0').trim().split(/\s+/).map(Number)
  return m.length === 12 && m.every(Number.isFinite) ? m : [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]
}
const apply = (m, x, y, z) => [x * m[0] + y * m[3] + z * m[6] + m[9], x * m[1] + y * m[4] + z * m[7] + m[10], x * m[2] + y * m[5] + z * m[8] + m[11]]

function parseObjects(xml) {
  const objects = {}
  for (const m of xml.matchAll(/<object\b([^>]*)>([\s\S]*?)<\/object>/g)) {
    const id = attr(m[1], 'id'), body = m[2]
    const verts = [...body.matchAll(/<vertex\b[^>]*>/g)].map((t) => [+attr(t[0], 'x'), +attr(t[0], 'y'), +attr(t[0], 'z')])
    const tris = [...body.matchAll(/<triangle\b[^>]*>/g)].map((t) => [+attr(t[0], 'v1'), +attr(t[0], 'v2'), +attr(t[0], 'v3')])
    const comps = [...body.matchAll(/<component\b[^>]*>/g)].map((t) => ({ id: attr(t[0], 'objectid'), path: attr(t[0], 'p:path'), m: mat(attr(t[0], 'transform')) }))
    objects[id] = { verts, tris, comps }
  }
  return objects
}
const det3 = (m) => m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6])

export async function parse3MF(buf) {
  // Bambu Studio and PrusaSlicer keep the meshes in 3D/Objects/*.model; the main file only has
  // <component p:path="/3D/Objects/object_1.model" .../> pointing at them. Read every .model file.
  const files = await unzip(buf, (n) => /\.model$/i.test(n))
  const mainName = Object.keys(files).find((n) => /(^|\/)3D\/3dmodel\.model$/i.test(n)) || Object.keys(files)[0]
  if (!mainName) throw new ParseError('That 3MF has no model in it.')
  const norm = (n) => '/' + n.replace(/^\/+/, '')
  const mainPath = norm(mainName)
  const tables = {}, units = {}
  for (const [n, bytes] of Object.entries(files)) {
    const xml = new TextDecoder().decode(bytes)
    tables[norm(n)] = parseObjects(xml)
    units[norm(n)] = UNIT_MM[attr(/<model\b[^>]*>/.exec(xml)?.[0] || '', 'unit') || 'millimeter'] ?? 1
  }
  const mainXml = new TextDecoder().decode(files[mainName])
  const unit = units[mainPath]
  const out = []
  const emit = (path, id, m, depth) => {
    const o = tables[path] && tables[path][id]; if (!o || depth > 8) return
    // A mirroring transform (negative determinant) flips the winding; flip the triangle back so its volume adds, not cancels.
    const flip = det3(m) < 0
    for (const t of o.tris) for (const vi of (flip ? [t[0], t[2], t[1]] : t)) { const v = o.verts[vi]; if (!v) throw new ParseError('The 3MF refers to a vertex that is not there.'); out.push(...apply(m, v[0], v[1], v[2])) }
    for (const c of o.comps) emit(c.path ? norm(c.path) : path, c.id, composed(m, c.m), depth + 1)
  }
  const items = [...mainXml.matchAll(/<item\b[^>]*>/g)].map((t) => ({ id: attr(t[0], 'objectid'), m: mat(attr(t[0], 'transform')) }))
  if (items.length) for (const it of items) emit(mainPath, it.id, it.m, 0)
  else { // no build section: every object that no component refers to
    const referenced = new Set(Object.values(tables[mainPath]).flatMap((o) => o.comps.map((c) => c.id)))
    for (const id of Object.keys(tables[mainPath])) if (!referenced.has(id)) emit(mainPath, id, mat(), 0)
  }
  if (!out.length) throw new ParseError('That 3MF has no triangles.')
  const f = Float32Array.from(out)
  if (unit !== 1) for (let i = 0; i < f.length; i++) f[i] *= unit
  return f
}
// child-then-parent composition for row-vector matrices: apply child first, then parent
function composed(parent, child) {
  const r = []
  for (const [x, y, z] of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, 0]]) { const c = apply(child, x, y, z); const p = apply(parent, c[0], c[1], c[2]); r.push(...p) }
  // columns above are images of basis vectors including translation; rebuild as rows minus translation
  const t = r.slice(9, 12)
  return [r[0] - t[0], r[1] - t[1], r[2] - t[2], r[3] - t[0], r[4] - t[1], r[5] - t[2], r[6] - t[0], r[7] - t[1], r[8] - t[2], t[0], t[1], t[2]]
}

export async function parseModel(buf, name) {
  if (buf.byteLength > MAX_BYTES) throw new ParseError('Models up to 100 MB, please.')
  const ext = (/\.([a-z0-9]+)$/i.exec(name) || [])[1]?.toLowerCase()
  const pos = ext === 'stl' ? parseSTL(buf) : ext === 'obj' ? parseOBJ(buf) : ext === '3mf' ? await parse3MF(buf) : (() => { throw new ParseError('Choose an STL, 3MF or OBJ file.') })()
  if (!pos.length) throw new ParseError('The model has no triangles.')
  for (let i = 0; i < pos.length; i++) if (!Number.isFinite(pos[i])) throw new ParseError('The model has invalid numbers in it.')
  return { pos, ext }
}
