// node --test tools/sunpath.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sunPosition, sunriseSunset, solarParams } from './sunpath.js'

const HYD = { lat: 17.385, lon: 78.4867 }
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tol ${tol})`)

test('June solstice noon at Hyderabad: sun north of zenith, high', () => {
  const { noon } = sunriseSunset({ ...HYD, date: new Date('2026-06-21T06:00:00Z') })
  const p = sunPosition({ ...HYD, date: noon })
  // declination ≈ 23.44 > lat 17.385 → sun is to the north at solar noon; elevation = 90 - (23.44-17.385)
  assert.ok(p.azimuth < 2 || p.azimuth > 358, `azimuth should be ~0, got ${p.azimuth}`)
  near(p.elevation, 90 - (p.declination - HYD.lat), 0.15, 'noon elevation')
  near(p.declination, 23.44, 0.05, 'june declination')
})

test('December solstice noon at Hyderabad: sun due south, elevation ≈ 49.2°', () => {
  const { noon } = sunriseSunset({ ...HYD, date: new Date('2026-12-21T06:00:00Z') })
  const p = sunPosition({ ...HYD, date: noon })
  near(p.azimuth, 180, 1.0, 'noon azimuth')
  near(p.elevation, 90 - (HYD.lat + 23.44), 0.2, 'noon elevation')
})

test('equinox: declination ≈ 0, day length ≈ 12h', () => {
  const d = new Date('2026-03-20T12:00:00Z')
  near(solarParams(d).declination, 0, 0.5, 'equinox declination')
  const { sunrise, sunset } = sunriseSunset({ ...HYD, date: d })
  const hours = (sunset - sunrise) / 3600000
  near(hours, 12.1, 0.15, 'equinox day length (incl. refraction)') // ~12h07 with the 0.833° zenith
})

test('equation of time: Nov 3 ≈ +16.4 min, Feb 11 ≈ -14.2 min', () => {
  near(solarParams(new Date('2026-11-03T12:00:00Z')).eot, 16.4, 0.4, 'eot nov')
  near(solarParams(new Date('2026-02-11T12:00:00Z')).eot, -14.2, 0.4, 'eot feb')
})

test('sun is below horizon at local midnight', () => {
  const p = sunPosition({ ...HYD, date: new Date('2026-06-21T18:30:00Z') }) // 00:00 IST
  assert.ok(p.elevation < -20, `elevation at midnight ${p.elevation}`)
})

test('sunrise azimuth east-of-north in June, south-of-east in December (northern tropics)', () => {
  const jun = sunriseSunset({ ...HYD, date: new Date('2026-06-21T06:00:00Z') })
  const dec = sunriseSunset({ ...HYD, date: new Date('2026-12-21T06:00:00Z') })
  const aJ = sunPosition({ ...HYD, date: jun.sunrise }).azimuth
  const aD = sunPosition({ ...HYD, date: dec.sunrise }).azimuth
  assert.ok(aJ > 60 && aJ < 70, `june sunrise azimuth ${aJ}`)   // ≈ 65°
  assert.ok(aD > 110 && aD < 120, `dec sunrise azimuth ${aD}`)  // ≈ 115°
})
