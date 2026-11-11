// Model parsers: STL (binary + ASCII), OBJ, 3MF. Pure, no DOM: runs in a Worker and under node --test.
// Output: Float32Array triangle soup in millimetres (9 floats per triangle).
import { parseBinarySTL, parseAsciiSTL } from './estimate.js'

export const MAX_BYTES = 100 * 1024 * 1024
export class ParseError extends Error {}

export function parseSTL(buf) {
  const dv = new DataView(buf)
  if (buf.byteLength >= 84) {
    const n = dv.getUint32(80, true)
    if (84 + n * 50 === buf.byteLength) return parseBinarySTL(buf)
  }
  const head = new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(buf.byteLength, 256)))
  if (!/^\s*solid/i.test(head) && !/facet|vertex/.test(head)) throw new ParseError('That does not look like an STL file.')
  const out = parseAsciiSTL(new TextDecoder().decode(buf))
  if (!out.length) throw new ParseError('The STL has no triangles.')
  return out
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

async function inflateRaw(bytes) {
  const ds = new DecompressionStream('deflate-raw')
  const w = ds.writable.getWriter(); w.write(bytes); w.close()
  return new Uint8Array(await new Response(ds.readable).arrayBuffer())
}

/** Minimal ZIP reader (central directory). Returns { name -> Uint8Array } for the entries asked for. */
export async function unzip(buf, want) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf)
  let eocd = -1
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  if (eocd < 0) throw new ParseError('That 3MF is not a valid archive.')
  const count = dv.getUint16(eocd + 10, true)
  let p = dv.getUint32(eocd + 16, true)
  const out = {}
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new ParseError('That 3MF archive is damaged.')
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true)
    const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true)
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nlen))
    if (want(name)) {
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

export async function parse3MF(buf) {
  const files = await unzip(buf, (n) => /(^|\/)[^/]*\.model$/i.test(n))
  const main = Object.keys(files).find((n) => /3D\/3dmodel\.model$/i.test(n)) || Object.keys(files)[0]
  if (!main) throw new ParseError('That 3MF has no model in it.')
  const xml = new TextDecoder().decode(files[main])
  const unit = UNIT_MM[attr(/<model\b[^>]*>/.exec(xml)?.[0] || '', 'unit') || 'millimeter'] ?? 1
  const objects = {}
  for (const m of xml.matchAll(/<object\b([^>]*)>([\s\S]*?)<\/object>/g)) {
    const id = attr(m[1], 'id'), body = m[2]
    const verts = [...body.matchAll(/<vertex\b[^>]*>/g)].map((t) => [+attr(t[0], 'x'), +attr(t[0], 'y'), +attr(t[0], 'z')])
    const tris = [...body.matchAll(/<triangle\b[^>]*>/g)].map((t) => [+attr(t[0], 'v1'), +attr(t[0], 'v2'), +attr(t[0], 'v3')])
    const comps = [...body.matchAll(/<component\b[^>]*>/g)].map((t) => ({ id: attr(t[0], 'objectid'), m: mat(attr(t[0], 'transform')) }))
    objects[id] = { verts, tris, comps }
  }
  const out = []
  const emit = (id, m, depth) => {
    const o = objects[id]; if (!o || depth > 8) return
    for (const t of o.tris) for (const vi of t) { const v = o.verts[vi]; if (!v) throw new ParseError('The 3MF refers to a vertex that is not there.'); out.push(...apply(m, v[0], v[1], v[2])) }
    for (const c of o.comps) emit(c.id, composed(m, c.m), depth + 1)
  }
  const items = [...xml.matchAll(/<item\b[^>]*>/g)].map((t) => ({ id: attr(t[0], 'objectid'), m: mat(attr(t[0], 'transform')) }))
  for (const it of items.length ? items : Object.keys(objects).map((id) => ({ id, m: mat() }))) emit(it.id, it.m, 0)
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
  for (let i = 0; i < pos.length; i++) if (!Number.isFinite(pos[i])) throw new ParseError('The model has invalid numbers in it.')
  return { pos, ext }
}
