// Tools from Koenigsberger, Ingersoll, Mayhew & Szokolay, "Manual of Tropical
// Housing and Building, Part 1: Climatic Design" (1974).
//
// Reference implementation for the Practice wing (06 §3.4). Port 1:1 into
// apps/asoc-com/src/scripts/arch/tropical.js. Pure functions, no I/O.
//
//  - Mahoney Tables 1–3: humidity groups, comfort limits, thermal stress, indicators.
//  - Shadow-angle protractor: horizontal / vertical shadow angles for a wall and
//    the sun position from sunpath.mjs, and whether a shading device covers it.
//
// Mahoney Tables 4–5 (sketch-design and element recommendations from indicator
// totals) are lookup tables: they go in data/mahoney.recommendations.json,
// transcribed from the book and checked by the owner. They are not guessed here.

/** Humidity group from a month's mean relative humidity (%). Table 1. */
export function humidityGroup(rhMean) {
  if (rhMean < 30) return 1
  if (rhMean < 50) return 2
  if (rhMean < 70) return 3
  return 4
}

// Table 2 comfort limits, °C: [dayLo, dayHi, nightLo, nightHi], by AMT band and humidity group.
const LIMITS = {
  warm: { 1: [26, 34, 17, 25], 2: [25, 31, 17, 24], 3: [23, 29, 17, 23], 4: [22, 27, 17, 21] }, // AMT > 20
  mild: { 1: [23, 32, 14, 23], 2: [22, 30, 14, 22], 3: [21, 28, 14, 21], 4: [20, 25, 14, 20] }, // 15–20
  cool: { 1: [21, 30, 12, 21], 2: [20, 27, 12, 20], 3: [19, 26, 12, 19], 4: [18, 24, 12, 18] }, // < 15
}

/** Annual mean temperature: (highest monthly mean max + lowest monthly mean min) / 2. */
export function annualMeanTemp(months) {
  const hi = Math.max(...months.map(m => m.tMax))
  const lo = Math.min(...months.map(m => m.tMin))
  return (hi + lo) / 2
}

export function comfortLimits(amt, group) {
  const band = amt > 20 ? 'warm' : amt >= 15 ? 'mild' : 'cool'
  const [dayLo, dayHi, nightLo, nightHi] = LIMITS[band][group]
  return { band, day: [dayLo, dayHi], night: [nightLo, nightHi] }
}

/** 'H' hot, 'O' comfortable, 'C' cold. */
function stress(t, [lo, hi]) {
  return t > hi ? 'H' : t < lo ? 'C' : 'O'
}

/**
 * One month's Mahoney indicators (Table 3).
 * month: { tMax, tMin, rhMean, rain } — monthly mean max/min °C, mean RH %, rainfall mm.
 */
export function monthIndicators(month, amt) {
  const g = humidityGroup(month.rhMean)
  const lim = comfortLimits(amt, g)
  const day = stress(month.tMax, lim.day)
  const night = stress(month.tMin, lim.night)
  const range = month.tMax - month.tMin
  const ind = {
    H1: (day === 'H' && g === 4) || (day === 'H' && (g === 2 || g === 3) && range < 10), // air movement essential
    H2: day === 'O' && g === 4,                                                          // air movement desirable
    H3: month.rain > 200,                                                                // rain protection necessary
    A1: g <= 3 && range > 10,                                                            // thermal capacity necessary
    A2: (night === 'H' && g <= 2) || (day === 'H' && night === 'O' && g <= 2 && range > 10), // outdoor sleeping desirable
    A3: day === 'C',                                                                     // protection from cold
  }
  return { group: g, limits: lim, day, night, range, indicators: ind }
}

/** Whole-year analysis: 12 months in, per-month rows and indicator totals out. */
export function mahoney(months) {
  if (months.length !== 12) throw new Error('mahoney: need 12 months')
  const amt = annualMeanTemp(months)
  const rows = months.map(m => monthIndicators(m, amt))
  const totals = { H1: 0, H2: 0, H3: 0, A1: 0, A2: 0, A3: 0 }
  for (const r of rows) for (const k in totals) if (r.indicators[k]) totals[k]++
  return { amt, rows, totals }
}

const rad = d => (d * Math.PI) / 180
const deg = r => (r * 180) / Math.PI

/**
 * Shadow angles for a wall (Koenigsberger ch. 6, shadow-angle protractor).
 * wallAzimuth: direction the wall faces, degrees clockwise from true north.
 * sun: { azimuth, elevation } in degrees (from sunpath.mjs).
 * Returns HSA (−90..90, signed) and VSA, or { lit: false } when the sun is behind the wall or below the horizon.
 */
export function shadowAngles(wallAzimuth, sun) {
  let hsa = ((sun.azimuth - wallAzimuth + 540) % 360) - 180
  if (sun.elevation <= 0 || Math.abs(hsa) >= 90) return { lit: false, hsa }
  const vsa = deg(Math.atan(Math.tan(rad(sun.elevation)) / Math.cos(rad(hsa))))
  return { lit: true, hsa, vsa }
}

/**
 * Does a shading device shade the window fully?
 * device: { vsa?: number, hsaLeft?: number, hsaRight?: number } — the device's cut-off angles:
 * a horizontal overhang shades when sun VSA ≥ device vsa; vertical fins shade when the sun's HSA
 * lies beyond the fin's cut-off on that side (left negative, right positive).
 */
export function isShaded(device, angles) {
  if (!angles.lit) return true
  if (device.vsa != null && angles.vsa >= device.vsa) return true
  if (device.hsaRight != null && angles.hsa >= device.hsaRight) return true
  if (device.hsaLeft != null && angles.hsa <= -device.hsaLeft) return true
  return false
}

/** Overhang depth needed to shade a window of height h at a target VSA. */
export function overhangDepth(height, vsa) {
  return height / Math.tan(rad(vsa))
}
