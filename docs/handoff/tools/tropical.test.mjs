import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  humidityGroup, comfortLimits, annualMeanTemp, monthIndicators, mahoney,
  shadowAngles, isShaded, overhangDepth,
} from './tropical.mjs'

test('humidity groups follow Table 1 boundaries', () => {
  assert.deepEqual([10, 30, 49.9, 50, 69.9, 70, 95].map(humidityGroup), [1, 2, 2, 3, 3, 4, 4])
})

test('comfort limits follow Table 2 by AMT band', () => {
  assert.deepEqual(comfortLimits(26, 4), { band: 'warm', day: [22, 27], night: [17, 21] })
  assert.deepEqual(comfortLimits(17, 1), { band: 'mild', day: [23, 32], night: [14, 23] })
  assert.deepEqual(comfortLimits(10, 3), { band: 'cool', day: [19, 26], night: [12, 19] })
})

test('AMT is the mean of the extreme monthly means', () => {
  assert.equal(annualMeanTemp([{ tMax: 40, tMin: 25 }, { tMax: 28, tMin: 14 }]), 27)
})

test('warm-humid monsoon month: air movement essential, rain protection', () => {
  const r = monthIndicators({ tMax: 31, tMin: 23, rhMean: 80, rain: 260 }, 26)
  assert.equal(r.day, 'H')
  assert.equal(r.indicators.H1, true)
  assert.equal(r.indicators.H3, true)
  assert.equal(r.indicators.A1, false)
})

test('hot-dry month: thermal capacity and outdoor sleeping', () => {
  const r = monthIndicators({ tMax: 40, tMin: 26, rhMean: 25, rain: 5 }, 26)
  assert.equal(r.group, 1)
  assert.equal(r.night, 'H')
  assert.equal(r.indicators.A1, true)
  assert.equal(r.indicators.A2, true)
  assert.equal(r.indicators.H1, false)
})

test('cold day gives A3', () => {
  const r = monthIndicators({ tMax: 15, tMin: 5, rhMean: 60, rain: 20 }, 12)
  assert.equal(r.day, 'C')
  assert.equal(r.indicators.A3, true)
})

test('mahoney totals count months per indicator', () => {
  const humid = { tMax: 31, tMin: 23, rhMean: 80, rain: 260 }
  const dry = { tMax: 40, tMin: 26, rhMean: 25, rain: 5 }
  const out = mahoney([...Array(4).fill(humid), ...Array(8).fill(dry)])
  assert.equal(out.totals.H1, 4)
  assert.equal(out.totals.H3, 4)
  assert.equal(out.totals.A1, 8)
  assert.throws(() => mahoney([humid]))
})

test('shadow angles: sun square on a south wall', () => {
  const a = shadowAngles(180, { azimuth: 180, elevation: 49.2 })
  assert.equal(a.lit, true)
  assert.equal(a.hsa, 0)
  assert.ok(Math.abs(a.vsa - 49.2) < 1e-9)
})

test('shadow angles: oblique sun raises VSA; sun behind wall is unlit', () => {
  const a = shadowAngles(180, { azimuth: 225, elevation: 45 })
  assert.equal(a.hsa, 45)
  assert.ok(Math.abs(a.vsa - 54.7356) < 1e-3)
  assert.equal(shadowAngles(180, { azimuth: 10, elevation: 60 }).lit, false)
  assert.equal(shadowAngles(180, { azimuth: 180, elevation: -2 }).lit, false)
})

test('overhang and fins shade per their cut-off angles', () => {
  const a = shadowAngles(180, { azimuth: 225, elevation: 45 })
  assert.equal(isShaded({ vsa: 50 }, a), true)
  assert.equal(isShaded({ vsa: 60 }, a), false)
  assert.equal(isShaded({ hsaRight: 40 }, a), true)
  assert.equal(isShaded({ hsaLeft: 40 }, a), false)
  assert.ok(Math.abs(overhangDepth(1.2, 45) - 1.2) < 1e-9)
})
