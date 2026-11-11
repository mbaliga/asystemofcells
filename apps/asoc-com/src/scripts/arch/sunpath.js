// sunpath.js — NOAA solar position. A 1:1 port of docs/handoff/tools/sunpath.mjs (the reference); keep identical apart from this header.
// Pure functions, no DOM. lat +N, lon +E (degrees); azimuth clockwise from north.
//
//   import { sunPosition, sunriseSunset, dayTable } from './sunpath.mjs'
//   sunPosition({ lat: 17.385, lon: 78.4867, date: new Date('2026-06-21T06:42:00Z') })
//   → { azimuth, elevation, zenith, declination, eot, trueSolarTime, hourAngle }
//
// Conventions: lat +N, lon +E (degrees). `date` is a JS Date (an absolute instant); the caller
// handles time zones (build the instant with the visitor's IANA zone). Azimuth clockwise from north.

const D2R = Math.PI / 180, R2D = 180 / Math.PI
const sin = x => Math.sin(x * D2R), cos = x => Math.cos(x * D2R), tan = x => Math.tan(x * D2R)
const asin = x => Math.asin(Math.max(-1, Math.min(1, x))) * R2D
const acos = x => Math.acos(Math.max(-1, Math.min(1, x))) * R2D

export function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5
}

/** Core quantities for an instant: declination (deg) and equation of time (minutes). */
export function solarParams(date) {
  const T = (julianDay(date) - 2451545) / 36525                      // Julian century
  const L0 = ((280.46646 + T * (36000.76983 + T * 0.0003032)) % 360 + 360) % 360
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T)
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T)
  const C = sin(M) * (1.914602 - T * (0.004817 + 0.000014 * T)) + sin(2 * M) * (0.019993 - 0.000101 * T) + sin(3 * M) * 0.000289
  const trueLong = L0 + C
  const omega = 125.04 - 1934.136 * T
  const lambda = trueLong - 0.00569 - 0.00478 * sin(omega)            // apparent longitude
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60
  const eps = eps0 + 0.00256 * cos(omega)                            // corrected obliquity
  const declination = asin(sin(eps) * sin(lambda))
  const y = tan(eps / 2) ** 2
  const eot = 4 * R2D * (y * sin(2 * L0) - 2 * e * sin(M) + 4 * e * y * sin(M) * cos(2 * L0) - 0.5 * y * y * sin(4 * L0) - 1.25 * e * e * sin(2 * M))
  return { T, declination, eot, eps, lambda }
}

/** Atmospheric refraction correction (degrees) for an apparent elevation, NOAA piecewise. */
export function refraction(elev) {
  if (elev > 85) return 0
  const te = tan(elev)
  let r
  if (elev > 5) r = 58.1 / te - 0.07 / te ** 3 + 0.000086 / te ** 5
  else if (elev > -0.575) r = 1735 + elev * (-518.2 + elev * (103.4 + elev * (-12.79 + elev * 0.711)))
  else r = -20.774 / te
  return r / 3600
}

export function sunPosition({ lat, lon, date, refract = true }) {
  const { declination, eot } = solarParams(date)
  const minutesUTC = (date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60)
  const trueSolarTime = ((minutesUTC + eot + 4 * lon) % 1440 + 1440) % 1440
  const hourAngle = trueSolarTime / 4 < 0 ? trueSolarTime / 4 + 180 : trueSolarTime / 4 - 180
  const cosZen = sin(lat) * sin(declination) + cos(lat) * cos(declination) * cos(hourAngle)
  const zenith = acos(cosZen)
  let azimuth
  const denom = cos(lat) * sin(zenith)
  if (Math.abs(denom) < 1e-9) azimuth = declination > lat ? 0 : 180      // sun exactly at zenith/nadir line
  else {
    const a = acos((sin(lat) * cos(zenith) - sin(declination)) / denom)
    azimuth = hourAngle > 0 ? (a + 180) % 360 : (540 - a) % 360
  }
  const elevGeom = 90 - zenith
  const elevation = refract ? elevGeom + refraction(elevGeom) : elevGeom
  return { azimuth, elevation, zenith: 90 - elevation, declination, eot, trueSolarTime, hourAngle }
}

/** Sunrise/sunset/solar noon as UTC Dates for the civil day containing `date` (UTC midnight anchor). */
export function sunriseSunset({ lat, lon, date }) {
  const noonUTC = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12))
  // iterate once: EoT at approximate solar noon
  let { eot, declination } = solarParams(noonUTC)
  const solarNoonMin = 720 - 4 * lon - eot
  const noon = new Date(noonUTC.getTime() + (solarNoonMin - 720) * 60000)
  ;({ eot, declination } = solarParams(noon))
  const cosHA = (cos(90.833) / (cos(lat) * cos(declination))) - tan(lat) * tan(declination)
  if (cosHA > 1) return { sunrise: null, sunset: null, noon, polarNight: true }
  if (cosHA < -1) return { sunrise: null, sunset: null, noon, midnightSun: true }
  const ha = acos(cosHA)
  const base = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  const noonMin = 720 - 4 * lon - eot
  return {
    sunrise: new Date(base + (noonMin - ha * 4) * 60000),
    sunset: new Date(base + (noonMin + ha * 4) * 60000),
    noon: new Date(base + noonMin * 60000),
  }
}

/** Day table at `stepMin` between sunrise and sunset. */
export function dayTable({ lat, lon, date, stepMin = 10 }) {
  const { sunrise, sunset } = sunriseSunset({ lat, lon, date })
  if (!sunrise) return []
  const rows = []
  for (let t = sunrise.getTime(); t <= sunset.getTime(); t += stepMin * 60000) {
    const d = new Date(t)
    rows.push({ time: d, ...sunPosition({ lat, lon, date: d }) })
  }
  return rows
}

/** Stereographic projection of (azimuth, elevation) onto a unit disc, north up. */
export function project(az, el) {
  const r = Math.tan((90 - el) * D2R / 2)      // 0 at zenith, 1 at horizon
  return { x: r * sin(az), y: -r * cos(az) }
}
