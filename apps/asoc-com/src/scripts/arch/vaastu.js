// Vastu Purusha Mandala overlay: pure functions over data/vaastu.zones.json (the practitioner's working tables,
// not physics). Grid is 9x9; cells are [row, col], row 0 = the plan's top edge, col 0 = its left edge.
// `northDeg` is where true north points on the plan, clockwise from the plan's top (0 = north is up).
import Z from '../../../../../data/vaastu.zones.json' with { type: 'json' }

const mod = (a, n) => ((a % n) + n) % n
export const CENTER = new Set(Z.center.cells.map(([r, c]) => `${r},${c}`))
export const isCenter = (row, col) => CENTER.has(`${row},${col}`)

/** True bearing (deg clockwise from north) of a cell's centre as seen from the grid centre. */
export function bearingOf(row, col, northDeg = 0) {
  const dx = col - 4, dy = 4 - row
  return mod((Math.atan2(dx, dy) * 180) / Math.PI - northDeg, 360)
}
const ID8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
const ID16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

export function zoneOf(row, col, northDeg = 0) {
  if (isCenter(row, col)) return { id8: 'center', id16: 'center', zone8: Z.center, zone16: null }
  const b = bearingOf(row, col, northDeg)
  const id8 = ID8[Math.round(b / 45) % 8], id16 = ID16[Math.round(b / 22.5) % 16]
  return { id8, id16, zone8: Z.zones8.find((z) => z.id === id8), zone16: Z.zones16.find((z) => z.id === id16) }
}

export const FUNCTIONS = ['entrance', 'living', 'kitchen', 'dining', 'bedroom', 'master bedroom', 'prayer', 'study', 'office', 'toilet', 'staircase', 'store', 'water storage', 'open court']

/** What the tradition says about a function in a zone: 'recommended' | 'avoided' | 'neutral'. Phrased as the tradition's, never as a verdict. */
export function judge(func, zoneInfo) {
  const lists = zoneInfo.zone8 ? [zoneInfo.zone8, zoneInfo.zone16].filter(Boolean) : []
  const has = (k) => lists.some((z) => (z[k] || []).some((x) => x.toLowerCase().includes(func.toLowerCase()) || func.toLowerCase().includes(x.toLowerCase())))
  if (has('avoid')) return 'avoided'
  if (has('recommend')) return 'recommended'
  return 'neutral'
}

export function zoneName(info) { return info.id8 === 'center' ? Z.center.name : `${info.zone8.name} (${info.id8})` }

/** The tradition's sentence for one tagged room. */
export function sentence(func, info) {
  const j = judge(func, info)
  const where = zoneName(info)
  if (j === 'recommended') return `The tradition places ${func} in ${where}.`
  if (j === 'avoided') return `The tradition keeps ${func} out of ${where}; it places ${(info.zone8 || Z.center).recommend.slice(0, 3).join(', ')} there.`
  return `The tradition says nothing particular about ${func} in ${where}.`
}

/** Entrance: `side` is a true direction (N/E/S/W) and `index` 1..8 along it (per padas32: E runs north to south, S east to west, W south to north, N west to east). */
export function entrance(side, index) {
  const name = Z.padas32[side] && Z.padas32[side][index - 1]
  if (!name) return null
  const favoured = (Z.padas32.favouredEntrance[side] || []).includes(index)
  return { side, index, pada: name, favoured, text: favoured ? `An entrance on ${name} (${side}${index}) is one the tradition favours.` : `The tradition favours ${(Z.padas32.favouredEntrance[side] || []).map((i) => Z.padas32[side][i - 1]).join(' or ')} on the ${side} side; ${name} is not one of them.` }
}

/** Per-zone coverage of a tagged-cell map: [{func,row,col}] -> report lines. */
export function report(tags, northDeg = 0, ent = null) {
  const lines = tags.map((t) => ({ ...t, zone: zoneName(zoneOf(t.row, t.col, northDeg)), verdict: judge(t.func, zoneOf(t.row, t.col, northDeg)), text: sentence(t.func, zoneOf(t.row, t.col, northDeg)) }))
  return { lines, entrance: ent, disclaimer: Z.surfaceCopy.disclaimer }
}
export const DISCLAIMER = Z.surfaceCopy.disclaimer
export const NEVER_USE = Z.surfaceCopy.neverUse
export const data = Z
