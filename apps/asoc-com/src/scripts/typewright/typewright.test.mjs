import { test } from 'node:test'
import assert from 'node:assert/strict'
import { strokesToContours, area, simplify, bounds } from './outline.js'
import { buildTtf } from './ttf.js'

test('contours are all clockwise and integer', () => {
  const cs = strokesToContours([[[0, 0], [100, 0], [100, 200]], [[300, 300]]], 60)
  assert.ok(cs.length >= 5)
  for (const c of cs) { assert.ok(area(c) < 0, 'clockwise'); for (const [x, y] of c) { assert.ok(Number.isInteger(x) && Number.isInteger(y)) } }
  const b = bounds(cs)
  assert.deepEqual([b.x0, b.y0, b.x1, b.y1], [-30, -30, 330, 330])
})

test('a single point is a dot; empty and zero-length strokes are ignored', () => {
  assert.equal(strokesToContours([[[5, 5]]], 40).length, 1)
  assert.equal(strokesToContours([[]], 40).length, 0)
  assert.equal(strokesToContours([[[0, 0], [0, 0]]], 40).length, 2) // two dots, no rectangle
})

test('rdp keeps corners and drops collinear points', () => {
  assert.deepEqual(simplify([[0, 0], [5, 0.1], [10, 0], [10, 10]], 1), [[0, 0], [10, 0], [10, 10]])
})

const u16 = (d, o) => d.getUint16(o), u32 = (d, o) => d.getUint32(o)
function tables(buf) {
  const d = new DataView(buf.buffer); const n = u16(d, 4); const t = {}
  for (let i = 0; i < n; i++) { const o = 12 + i * 16; t[String.fromCharCode(...buf.slice(o, o + 4))] = { off: u32(d, o + 8), len: u32(d, o + 12) } }
  return { d, t }
}

test('ttf: structure, checksum, cmap, glyph count', () => {
  const g = (cp, a) => ({ cp, advance: a, contours: strokesToContours([[[50, 0], [50, 700]]], 80) })
  const buf = buildTtf({ family: 'Test Font', created: 3e9 }, [g(0x41, 400), g(0x42, 420), g(0x20, 300), { cp: 0x20, advance: 1, contours: [] }].slice(0, 3).concat([{ cp: 0x915, advance: 500, contours: strokesToContours([[[0, 0], [300, 300]]], 60) }]))
  const { d, t } = tables(buf)
  assert.equal(buf.length % 4, 0)
  let sum = 0; for (let i = 0; i < buf.length; i += 4) sum = (sum + d.getUint32(i)) >>> 0
  assert.equal(sum, 0xb1b0afba)
  assert.equal(u16(d, t.maxp.off + 4), 5) // notdef + 4 glyphs
  assert.equal(u32(d, t.head.off + 12), 0x5f0f3cf5)
  // cmap format 4: find glyph for U+0042
  const c = t.cmap.off + u32(d, t.cmap.off + 8)
  assert.equal(u16(d, c), 4)
  const sc = u16(d, c + 6) / 2
  const end = (i) => u16(d, c + 14 + i * 2), start = (i) => u16(d, c + 16 + sc * 2 + i * 2), delta = (i) => u16(d, c + 16 + sc * 4 + i * 2)
  const look = (cp) => { for (let i = 0; i < sc; i++) if (cp <= end(i)) return cp >= start(i) ? (cp + delta(i)) & 0xffff : 0; return 0 }
  assert.equal(look(0x20), 1); assert.equal(look(0x41), 2); assert.equal(look(0x42), 3); assert.equal(look(0x915), 4); assert.equal(look(0x43), 0)
})

test('ttf rejects astral and duplicate codepoints', () => {
  assert.throws(() => buildTtf({ family: 'x' }, [{ cp: 0x1f600, advance: 500, contours: [] }]), /Basic Multilingual/)
  assert.throws(() => buildTtf({ family: 'x' }, [{ cp: 65, advance: 5, contours: [] }, { cp: 65, advance: 5, contours: [] }]), /Duplicate/)
})
