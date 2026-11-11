// Wind rose reading and a rule-based cross-ventilation read. Not CFD: it says which faces face the
// prevailing wind for a season and whether the openings you mark make a through-path.
export const SECTOR_NAMES = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
export const SEASONS = { all: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], summer: [2, 3, 4], monsoon: [5, 6, 7, 8], 'post-monsoon': [9, 10], winter: [11, 0, 1] }
export const SEASON_LABEL = { all: 'Whole year', summer: 'Summer (Mar–May)', monsoon: 'Monsoon (Jun–Sep)', 'post-monsoon': 'Post-monsoon (Oct–Nov)', winter: 'Winter (Dec–Feb)' }

/** Percent of hours per sector (wind FROM that sector) per speed band, hour-weighted over the months. */
export function sectorBands(rose, months) {
  const tot = rose.months.filter((_, i) => months.includes(i)).reduce((s, m) => s + m.n, 0)
  const out = SECTOR_NAMES.map(() => rose.bands.map(() => 0))
  for (const i of months) {
    const m = rose.months[i]
    m.pct.forEach((row, s) => row.forEach((v, b) => { out[s][b] += (v * m.n) / tot }))
  }
  const calm = months.reduce((s, i) => s + (rose.months[i].calmPct * rose.months[i].n) / tot, 0)
  const meanSpeed = months.reduce((s, i) => s + (rose.months[i].meanSpeed * rose.months[i].n) / tot, 0)
  return { bands: out, calm, meanSpeed, totals: out.map((r) => r.reduce((a, b) => a + b, 0)) }
}

export function prevailing(rose, months) {
  const { totals, calm, meanSpeed } = sectorBands(rose, months)
  let best = 0
  totals.forEach((v, i) => { if (v > totals[best]) best = i })
  return { sector: best, name: SECTOR_NAMES[best], deg: best * 22.5, pct: totals[best], calm, meanSpeed }
}

const angDiff = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return d > 180 ? 360 - d : d }

/**
 * A rectangular footprint turned `rotationDeg` clockwise from true north has four faces whose outward
 * normals are at rotationDeg + 0/90/180/270. Wind comes FROM `fromDeg`.
 * windward: the face looks into the wind (within 67.5 degrees); leeward: it looks away (beyond 112.5); else side.
 */
export function faceReadings(fromDeg, rotationDeg, open = {}) {
  const names = ['front', 'right', 'back', 'left']
  const faces = names.map((name, i) => {
    const normal = (rotationDeg + i * 90) % 360, d = angDiff(normal, fromDeg)
    return { name, normal, side: d < 67.5 ? 'windward' : d > 112.5 ? 'leeward' : 'side', open: !!open[name] }
  })
  const inlet = faces.some((f) => f.side === 'windward' && f.open)
  const outlet = faces.some((f) => f.side === 'leeward' && f.open)
  const sideAssist = faces.some((f) => f.side === 'side' && f.open)
  const through = inlet && outlet
  const text = through ? 'The openings you marked make a through-path from the windward face to the leeward face.'
    : inlet && sideAssist ? 'Air can enter on the windward face and leave by a side opening. That is a weaker path than windward to leeward.'
    : inlet ? 'Air can enter, but nothing is open on the leeward or a side face to let it out.'
    : outlet ? 'There is an opening to the leeward side but none on the windward face to let air in.'
    : 'No openings are marked on the windward or leeward faces.'
  return { faces, through, text }
}
