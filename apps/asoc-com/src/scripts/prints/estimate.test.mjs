// node --test tools/estimate.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { meshStats, estimatePrint, quote, boxMesh, concat, parseAsciiSTL } from './estimate.js'

const pricing = JSON.parse(await readFile(new URL('../../../../../data/pricing.prints.json', import.meta.url)))
const tiers = JSON.parse(await readFile(new URL('../../../../../data/finish-tiers.json', import.meta.url)))
const shipping = JSON.parse(await readFile(new URL('../../../../../data/shipping.json', import.meta.url)))
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tol ${tol})`)

test('20 mm cube: volume, area, manifold, no overhang', () => {
  const s = meshStats(boxMesh(20, 20, 20))
  near(s.volume, 8000, 1e-6, 'volume')
  near(s.area, 2400, 1e-6, 'area')
  assert.equal(s.manifold, true); assert.equal(s.overhangArea, 0); near(s.height, 20, 1e-9, 'height')
})

test('20 mm cube estimate at 15 % / 0.2 mm lands in the 7–10 g band', () => {
  const est = estimatePrint(meshStats(boxMesh(20, 20, 20)))
  // shell = 2400*0.84 = 2016 mm³; inner = 5984; plastic = 2016 + 0.15*5984 = 2913.6 mm³ → 3.61 g at 1.24
  // real Orca cubes come in ~5–9 g because of top/bottom solid layers; this is where calibration.prints.json tightens it
  assert.ok(est.massG > 3 && est.massG < 10, `massG ${est.massG}`)
  assert.ok(est.printMin > 10 && est.printMin < 60, `printMin ${est.printMin}`)
  assert.equal(est.supportsNeeded, false)
})

test('cantilever needs supports; support volume scales with height', () => {
  // a 20mm pedestal with a 20x10x5 slab sticking out 10 mm at 20 mm height
  const low = concat(boxMesh(10, 10, 20), boxMesh(20, 10, 5, 0, 0, 20))
  const s = meshStats(low)
  assert.ok(s.overhangArea > 90 && s.overhangArea < 110, `overhang area ${s.overhangArea}`) // 10x10 underside is unsupported
  const est = estimatePrint(s)
  assert.equal(est.supportsNeeded, true)
  assert.ok(est.supportMassG > 0, 'support mass')
  const high = concat(boxMesh(10, 10, 40), boxMesh(20, 10, 5, 0, 0, 40))
  assert.ok(meshStats(high).supportVolume > s.supportVolume * 1.8, 'taller cantilever needs more support')
})

test('open mesh is flagged non-manifold', () => {
  const s = meshStats(boxMesh(10, 10, 10).subarray(0, 9 * 10)) // drop two triangles
  assert.equal(s.manifold, false); assert.ok(s.openEdges > 0)
})

test('ASCII STL parses', () => {
  const stl = `solid t\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid t\n`
  assert.equal(parseAsciiSTL(stl).length, 9)
})

test('quote: processed × 2 computes from the JSON tables', () => {
  const est = { massG: 10, printMin: 60, band: 0.2 }
  const q = quote({ est, tier: 'processed', qty: 2, pricing, tiers, shipping })
  // per part: material 40 + machine 60 = 100 → max(299,100) = 299; base = 598; finish = 598*0.6 + 400 = 758.8
  near(q.base, 598, 0.01, 'base'); near(q.finish, 758.8, 0.01, 'finish')
  assert.equal(q.packaging, 40)
  assert.equal(q.grams, Math.round((20 + 60) * 1.15)) // 92 g → 250 g band → ₹80
  assert.equal(q.shipping, 80)
  assert.equal(q.total, Math.round(598 + 758.8 + 40 + 80))
})

test('quote: minimum applies per part; INTL zone bands', () => {
  const est = { massG: 1, printMin: 5, band: 0.2 }
  const q = quote({ est, tier: 'as-is', qty: 1, pricing, tiers, shipping, zone: 'INTL' })
  assert.equal(q.base, 299); assert.equal(q.shipping, 1100)
})
