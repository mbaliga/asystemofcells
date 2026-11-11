import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { prevailing, sectorBands, faceReadings, SEASONS } from './wind.js'

const hyd = JSON.parse(readFileSync(new URL('../../../../../data/windroses/hyderabad.json', import.meta.url)))

test('Hyderabad: the monsoon prevails from the west-south-west to west; winter is not the same sector', () => {
  const mon = prevailing(hyd, SEASONS.monsoon), win = prevailing(hyd, SEASONS.winter)
  assert.ok(mon.deg >= 225 && mon.deg <= 292.5, `monsoon from ${mon.name} (${mon.deg})`)
  assert.notEqual(mon.name, win.name)
  assert.ok(mon.pct > 5 && mon.pct < 60)
})
test('percentages add up with the calms to about 100', () => {
  const s = sectorBands(hyd, SEASONS.all)
  assert.ok(Math.abs(s.totals.reduce((a, b) => a + b, 0) + s.calm - 100) < 3, `${s.totals.reduce((a, b) => a + b, 0) + s.calm}`)
})
test('faces: wind from the south-west and a north-up plan: the north face is 135 degrees away, so leeward', () => {
  const r = faceReadings(225, 0, {})
  assert.equal(r.faces.find((f) => f.name === 'front').side, 'leeward') // faces N, 135 degrees from the SW wind
  assert.equal(r.faces.find((f) => f.name === 'back').side, 'windward') // faces S, 45 degrees from the SW wind

  assert.equal(faceReadings(180, 0).faces.find((f) => f.name === 'back').side, 'windward') // back faces S, wind from S
  assert.equal(faceReadings(180, 0).faces.find((f) => f.name === 'front').side, 'leeward')
})
test('through-path needs a windward and a leeward opening', () => {
  assert.ok(faceReadings(180, 0, { back: true, front: true }).through)
  assert.ok(!faceReadings(180, 0, { back: true }).through)
  assert.ok(!faceReadings(180, 0, { front: true }).through)
  assert.match(faceReadings(180, 0, { back: true, left: true }).text, /weaker/)
})
