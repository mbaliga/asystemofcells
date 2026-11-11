// estimate.js — Stage 0 print estimator. A 1:1 port of docs/handoff/tools/estimate.mjs (the reference),
// run in the slicer Worker. Pure functions over a triangle soup: Float32Array, 9 floats per triangle, mm.
// Keep this file identical to the reference apart from this header; estimate.test.mjs runs the reference suite on it.

export const FILAMENTS = { PLA: { density: 1.24 }, PETG: { density: 1.27 }, TPU: { density: 1.21 }, ABS: { density: 1.04 } }

export const DEFAULT_SETTINGS = {
  layerHeight: 0.2, lineWidth: 0.42, perimeters: 2, topBottomMm: 0.8, infillPct: 15,
  supports: 'auto', overhangDeg: 45, supportFill: 0.12, filament: 'PLA',
}

export const DEFAULT_CALIBRATION = {
  // g/h by layer height on the A1 mini — PLACEHOLDERS until data/calibration.prints.json is filled from Orca
  gramsPerHour: { 0.08: 8, 0.12: 11, 0.16: 14, 0.2: 16, 0.24: 18, 0.28: 20 },
  layerOverheadSec: 1.2, supportSlowdown: 1.3, fixedMin: 6, plateEpsilonMm: 0.3,
}

/** Geometry: volume, area, bbox, overhang area/support volume, manifold check.
 *  Support detection is a height-map occlusion test, not a face-normal count: a downward face only
 *  needs support where nothing of the model lies beneath it, and the support height is the gap to
 *  the surface below (or to the plate). Resolution `cellMm` (default 1 mm). */
export function meshStats(pos, { overhangDeg = 45, supportFill = 0.12, plateEpsilonMm = 0.3, cellMm: cellMm0 = 1 } = {}) {
  const n = pos.length / 9
  if (n < 1) throw new Error('empty mesh')
  let vol = 0, area = 0
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  const edges = new Map()
  const key = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`
  const q = (x) => Math.round(x * 1e4) + 0                       // +0: float noise around zero must not split a vertex into -0 / 0
  const vkey = (x, y, z) => `${q(x)},${q(y)},${q(z)}`
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { const v = pos[i + k]; if (v < min[k]) min[k] = v; if (v > max[k]) max[k] = v }
  const z0 = min[2]
  // Keep the raster grid bounded: a model in the wrong unit (microns read as mm) must not allocate gigabytes.
  const cellMm = Math.max(cellMm0, (max[0] - min[0]) / 2048, (max[1] - min[1]) / 2048, 1e-3)
  // An inside-out mesh (negative signed volume) has every normal reversed: flip them, or the top reads as an overhang.
  let sv = 0
  for (let i = 0; i < pos.length; i += 9) sv += (pos[i] * (pos[i + 4] * pos[i + 8] - pos[i + 5] * pos[i + 7]) - pos[i + 1] * (pos[i + 3] * pos[i + 8] - pos[i + 5] * pos[i + 6]) + pos[i + 2] * (pos[i + 3] * pos[i + 7] - pos[i + 4] * pos[i + 6])) / 6
  const sgn = sv < 0 ? -1 : 1
  const sinOver = Math.sin(overhangDeg * Math.PI / 180)
  const W = Math.max(1, Math.ceil((max[0] - min[0]) / cellMm) + 1), H = Math.max(1, Math.ceil((max[1] - min[1]) / cellMm) + 1)
  const up = new Array(W * H)            // per cell: array of z of upward-facing surface samples
  const down = []                        // downward-face samples: [cellIndex, z, areaShare]
  const cellOf = (x, y) => Math.min(W - 1, Math.floor((x - min[0]) / cellMm)) + W * Math.min(H - 1, Math.floor((y - min[1]) / cellMm))
  let overhangArea = 0
  for (let t = 0; t < n; t++) {
    const o = t * 9
    const ax = pos[o], ay = pos[o + 1], az = pos[o + 2], bx = pos[o + 3], by = pos[o + 4], bz = pos[o + 5], cx = pos[o + 6], cy = pos[o + 7], cz = pos[o + 8]
    vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    const len = Math.hypot(nx, ny, nz); const a = len / 2; area += a
    if (len > 0) {
      const nzn = sgn * nz / len
      const projArea = Math.abs(a * nzn)                              // xy-projected area
      if (projArea > 1e-9 && (nzn > 0 || nzn < -sinOver)) {
        // rasterise the triangle's xy projection: every cell whose centre is inside gets a sample
        // (z by barycentric interpolation); small triangles that cover no centre get their centroid.
        const samples = []
        const x0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - min[0]) / cellMm)), x1 = Math.min(W - 1, Math.floor((Math.max(ax, bx, cx) - min[0]) / cellMm))
        const y0 = Math.max(0, Math.floor((Math.min(ay, by, cy) - min[1]) / cellMm)), y1 = Math.min(H - 1, Math.floor((Math.max(ay, by, cy) - min[1]) / cellMm))
        const det = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)
        if (Math.abs(det) > 1e-12) {
          for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
            const px = min[0] + (gx + 0.5) * cellMm, py = min[1] + (gy + 0.5) * cellMm
            const l1 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) / det   // barycentric of a
            const l2 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) / det   // of b
            const l3 = 1 - l1 - l2
            if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue
            samples.push([gx + W * gy, l1 * az + l2 * bz + l3 * cz, cellMm * cellMm])
          }
        }
        if (samples.length === 0) samples.push([cellOf((ax + bx + cx) / 3, (ay + by + cy) / 3), (az + bz + cz) / 3, projArea])
        for (const [c, z, share] of samples) {
          if (nzn > 0) (up[c] ||= []).push(z)
          else if (z - z0 > plateEpsilonMm) down.push([c, z, Math.min(share, projArea)])
        }
      }
    }
    const ka = vkey(ax, ay, az), kb = vkey(bx, by, bz), kc = vkey(cx, cy, cz)
    for (const [e1, e2] of [[ka, kb], [kb, kc], [kc, ka]]) if (e1 !== e2) { const e = key(e1, e2); edges.set(e, (edges.get(e) || 0) + 1) }   // collapsed edges can never pair up: skip
  }
  for (const list of up) if (list) list.sort((p, q) => p - q)
  let supportVolume = 0, supportedArea = 0
  for (const [c, z, share] of down) {
    // highest upward surface at or below this sample (within epsilon counts as touching → self-supported);
    // a gap larger than epsilon needs support of that height; nothing below → support down to the plate
    const list = up[c]; let below = z0
    if (list) { let lo = 0, hi = list.length; while (lo < hi) { const m = (lo + hi) >> 1; if (list[m] <= z + plateEpsilonMm) lo = m + 1; else hi = m } if (lo > 0) below = list[lo - 1] }
    const gap = z - below
    if (gap > plateEpsilonMm) { supportedArea += share; supportVolume += share * gap * supportFill }
  }
  overhangArea = supportedArea
  let openEdges = 0; for (const c of edges.values()) if (c !== 2) openEdges++
  return { triangles: n, volume: Math.abs(vol), area, bbox: { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] },
    height: max[2] - min[2], overhangArea, supportVolume, manifold: openEdges === 0, openEdges }
}

export function estimatePrint(stats, settings = {}, cal = DEFAULT_CALIBRATION) {
  const s = { ...DEFAULT_SETTINGS, ...settings }
  s.layerHeight = Math.min(0.32, Math.max(0.04, +s.layerHeight || 0.2))   // never a zero or negative layer / infill
  s.infillPct = Math.min(100, Math.max(0, +s.infillPct || 0))
  const density = (FILAMENTS[s.filament] || FILAMENTS.PLA).density
  const wallT = s.perimeters * s.lineWidth
  const shellVolume = Math.min(stats.volume, stats.area * wallT)
  const innerVolume = Math.max(0, stats.volume - shellVolume)
  const plasticVolume = shellVolume + (s.infillPct / 100) * innerVolume
  const partMassG = density * plasticVolume / 1000
  const supportMassG = s.supports === 'none' ? 0 : density * stats.supportVolume / 1000
  const gph = cal.gramsPerHour[s.layerHeight] ?? interp(cal.gramsPerHour, s.layerHeight)
  const layers = Math.ceil(stats.height / s.layerHeight)
  const printMin = 60 * partMassG / gph + layers * cal.layerOverheadSec / 60 + 60 * supportMassG / gph * cal.supportSlowdown + cal.fixedMin
  return { massG: partMassG + supportMassG, partMassG, supportMassG, printMin, layers, gramsPerHour: gph, band: 0.2,
    supportsNeeded: stats.overhangArea > 0 && s.supports !== 'none', wallT, plasticVolume }
}

function interp(table, x) {
  const ks = Object.keys(table).map(Number).sort((a, b) => a - b)
  if (x <= ks[0]) return table[ks[0]]; if (x >= ks[ks.length - 1]) return table[ks[ks.length - 1]]
  for (let i = 1; i < ks.length; i++) if (x <= ks[i]) { const a = ks[i - 1], b = ks[i]; return table[a] + (table[b] - table[a]) * (x - a) / (b - a) }
}

/** Quote from pricing.prints.json + finish-tiers.json + shipping.json; identical on client and server. */
export function quote({ est, tier, qty = 1, filament = 'PLA', zone = 'IN', pricing, tiers, shipping, fragile = false }) {
  const t = tiers.tiers.find(x => x.id === tier); if (!t) throw new Error('unknown tier ' + tier)
  const material = est.massG * (pricing.inrPerGram[filament] ?? pricing.inrPerGram.PLA)
  const machine = est.printMin / 60 * pricing.inrPerHour
  const basePer = Math.max(pricing.minimumInr, material + machine)
  const base = basePer * qty
  const finish = base * (t.multiplier - 1) + t.adderInrPerPart * qty
  const packaging = pricing.packagingInr
  const grams = (est.massG * qty + pricing.boxGrams) * (1 + shipping.packagingAllowancePct / 100)
  const z = shipping.zones[zone]; const band = z.bands.find(b => grams <= b.maxGrams) || z.bands[z.bands.length - 1]
  let ship = band.inr + (fragile ? shipping.fragileSurchargeInr : 0)
  const free = shipping.freeShippingOverInr[zone]; if (free != null && base + finish >= free) ship = 0
  const total = Math.round(base + finish + packaging + ship)
  return { material: r2(material * qty), machine: r2(machine * qty), base: r2(base), finish: r2(finish), packaging, shipping: ship, total, bandInr: Math.round(total * est.band), grams: Math.round(grams), zone }
}
const r2 = x => Math.round(x * 100) / 100

/** Minimal STL parsers for tests and the Worker (ASCII + binary). */
export function parseBinarySTL(buf) {
  const dv = new DataView(buf); const n = dv.getUint32(80, true); const out = new Float32Array(n * 9)
  for (let i = 0; i < n; i++) { const o = 84 + i * 50; for (let k = 0; k < 9; k++) out[i * 9 + k] = dv.getFloat32(o + 12 + k * 4, true) }
  return out
}
export function parseAsciiSTL(text) {
  const v = []; const re = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g; let m
  while ((m = re.exec(text))) v.push(+m[1], +m[2], +m[3])
  return Float32Array.from(v)
}

/** Synthetic fixtures: closed box (outward normals), optional cantilever overhang. */
export function boxMesh(w, d, h, ox = 0, oy = 0, oz = 0) {
  const p = (x, y, z) => [x + ox, y + oy, z + oz]
  const v = [p(0,0,0), p(w,0,0), p(w,d,0), p(0,d,0), p(0,0,h), p(w,0,h), p(w,d,h), p(0,d,h)]
  const quads = [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]] // outward-facing
  const tris = []
  for (const [a,b,c,d_] of quads) tris.push(...v[a], ...v[b], ...v[c], ...v[a], ...v[c], ...v[d_])
  return Float32Array.from(tris)
}
export function concat(...arrs) { const n = arrs.reduce((s, a) => s + a.length, 0); const out = new Float32Array(n); let o = 0; for (const a of arrs) { out.set(a, o); o += a.length } return out }
