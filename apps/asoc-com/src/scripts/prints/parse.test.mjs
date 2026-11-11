import { test } from 'node:test'
import assert from 'node:assert/strict'
import zlib from 'node:zlib'
import { parseModel, parseSTL, parseOBJ, parse3MF, ParseError } from './parse.js'
import { placeOnPlate, layFlat, rotateZ, fits, scaleToFit, bbox, scaled } from './place.js'
import { meshStats, boxMesh, parseBinarySTL } from './estimate.js'

const binSTL = (pos) => {
  const n = pos.length / 9, b = Buffer.alloc(84 + n * 50)
  b.writeUInt32LE(n, 80)
  for (let i = 0; i < n; i++) for (let k = 0; k < 9; k++) b.writeFloatLE(pos[i * 9 + k], 84 + i * 50 + 12 + k * 4)
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.length)
}
const ab = (s) => new TextEncoder().encode(s).buffer

// A tiny ZIP writer (stored + deflated) so the 3MF reader is tested against real archives.
function zip(files, deflate = true) {
  const parts = [], central = []; let off = 0
  for (const [name, data] of Object.entries(files)) {
    const raw = Buffer.from(data), comp = deflate ? zlib.deflateRawSync(raw) : raw, nb = Buffer.from(name)
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(deflate ? 8 : 0, 8); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nb.length, 26)
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(deflate ? 8 : 0, 10); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42)
    parts.push(lh, nb, comp); central.push(ch, nb); off += 30 + nb.length + comp.length
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16)
  const out = Buffer.concat([...parts, cd, end]); return out.buffer.slice(out.byteOffset, out.byteOffset + out.length)
}
const CUBE_VERTS = [[0,0,0],[10,0,0],[10,10,0],[0,10,0],[0,0,10],[10,0,10],[10,10,10],[0,10,10]]
const CUBE_TRIS = [[0,3,2],[0,2,1],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]]
const objXml = (id, extra = '') => `<object id="${id}" type="model"><mesh><vertices>${CUBE_VERTS.map(([x,y,z]) => `<vertex x="${x}" y="${y}" z="${z}"/>`).join('')}</vertices><triangles>${CUBE_TRIS.map(([a,b,c]) => `<triangle v1="${a}" v2="${b}" v3="${c}"/>`).join('')}</triangles></mesh>${extra}</object>`
const model = (inner, unit = 'millimeter') => `<?xml version="1.0"?><model unit="${unit}" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources>${inner}</resources>`

test('STL: binary round trip and ASCII, with the right errors', () => {
  const box = boxMesh(20, 20, 20)
  assert.deepEqual(Array.from(parseSTL(binSTL(box))), Array.from(box))
  const asc = 'solid x\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid'
  assert.equal(parseSTL(ab(asc)).length, 9)
  assert.throws(() => parseSTL(ab('hello world, not an stl file at all')), ParseError)
})

test('OBJ: quads are triangulated, negative indices resolve, bad refs are refused', () => {
  const quad = 'v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1 2 3 4\n'
  assert.equal(parseOBJ(ab(quad)).length, 18)
  assert.equal(parseOBJ(ab('v 0 0 0\nv 1 0 0\nv 0 1 0\nf -3 -2 -1\n')).length, 9)
  assert.throws(() => parseOBJ(ab('v 0 0 0\nf 1 2 3\n')), ParseError)
  assert.throws(() => parseOBJ(ab('# nothing')), ParseError)
})

test('3MF: reads a deflated archive; build-item transform and component transform both apply; units convert', async () => {
  const plain = zip({ '3D/3dmodel.model': model(objXml(1) + '<build><item objectid="1"/></build>') })
  const a = await parse3MF(plain); assert.equal(a.length, 12 * 9); assert.deepEqual(bbox(a).size, [10, 10, 10])
  const moved = zip({ '3D/3dmodel.model': model(objXml(1) + '<build><item objectid="1" transform="1 0 0 0 1 0 0 0 1 100 0 0"/></build>') }, false)
  assert.equal(bbox(await parse3MF(moved)).min[0], 100)
  const comp = zip({ '3D/3dmodel.model': model(objXml(1) + `<object id="2"><components><component objectid="1" transform="1 0 0 0 1 0 0 0 1 5 0 0"/></components></object><build><item objectid="2" transform="2 0 0 0 2 0 0 0 2 100 0 0"/></build>`) })
  const c = bbox(await parse3MF(comp)) // child shifted 5, then item scales x2 and shifts 100 -> x from 110 to 130
  assert.deepEqual([c.min[0], c.max[0], c.size[2]], [110, 130, 20])
  const inch = zip({ '3D/3dmodel.model': model(objXml(1) + '<build><item objectid="1"/></build>', 'inch') })
  assert.ok(Math.abs(bbox(await parse3MF(inch)).size[0] - 254) < 1e-3)
  await assert.rejects(parse3MF(ab('not a zip at all, nothing to see here')), ParseError)
})

test('parseModel: dispatches by extension, refuses unknown types, oversize and NaN', async () => {
  assert.equal((await parseModel(binSTL(boxMesh(5, 5, 5)), 'a.STL')).ext, 'stl')
  await assert.rejects(parseModel(ab('x'), 'a.exe'), ParseError)
  await assert.rejects(parseModel({ byteLength: 101 * 1024 * 1024 }, 'a.stl'), ParseError)
  const bad = new Float32Array(9).fill(NaN); await assert.rejects(parseModel(binSTL(bad), 'a.stl'), ParseError)
})

test('place: centres on the plate and rests on z = 0; rotateZ keeps shape', () => {
  const p = placeOnPlate(boxMesh(20, 20, 20, 500, -30, 12), { x: 180, y: 180, z: 180 }); const b = bbox(p)
  assert.deepEqual([b.min[0], b.max[0], b.min[1], b.max[1], b.min[2]], [80, 100, 80, 100, 0])
  const r = bbox(rotateZ(boxMesh(10, 30, 5), 1)); assert.deepEqual(r.size.map(Math.round), [30, 10, 5])
})

test('layFlat: a cube tilted 30° about X comes to rest on a face; volume is preserved', () => {
  const cube = boxMesh(20, 20, 20), a = Math.PI / 6, c = Math.cos(a), s = Math.sin(a)
  const tilted = Float32Array.from(cube, (v, i) => v) // rotate about X
  for (let i = 0; i < tilted.length; i += 3) { const y = cube[i + 1], z = cube[i + 2]; tilted[i + 1] = y * c - z * s; tilted[i + 2] = y * s + z * c }
  const flat = placeOnPlate(layFlat(tilted)), b = bbox(flat)
  assert.ok(b.size[2] < 20.01, `height ${b.size[2]}`); assert.ok(Math.abs(meshStats(flat).volume - 8000) < 1)
  let contact = 0; for (let i = 2; i < flat.length; i += 3) if (flat[i] < 1e-3) contact++
  assert.ok(contact >= 6, `a whole face should be on the plate (${contact} vertices)`) // yaw is free; the contact face is what matters
})

test('layFlat puts the biggest face down on a plank, fits() and scaleToFit() judge the volume', () => {
  const plank = boxMesh(60, 10, 4); const up = Float32Array.from(plank)
  for (let i = 0; i < up.length; i += 3) { const y = plank[i + 1], z = plank[i + 2]; up[i + 1] = z; up[i + 2] = y } // stood on its 4 mm edge's long side
  const flatBox = bbox(placeOnPlate(layFlat(up))).size; assert.ok(flatBox[2] <= 4.01, `height ${flatBox[2]}`) // the 60x10 face is down, not the 60x4 edge
  const vol = { x: 180, y: 180, z: 180 }
  assert.ok(fits(boxMesh(180, 180, 180), vol)); assert.ok(!fits(boxMesh(181, 10, 10), vol))
  assert.ok(scaleToFit(boxMesh(190, 10, 10), vol) > 0.94); assert.equal(scaleToFit(boxMesh(400, 10, 10), vol), null); assert.equal(scaleToFit(boxMesh(10, 10, 10), vol), null)
  assert.equal(bbox(scaled(boxMesh(10, 10, 10), 2)).size[0], 20)
})
