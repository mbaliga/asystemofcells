import { test } from 'node:test'
import assert from 'node:assert/strict'
import { zoneOf, bearingOf, isCenter, entrance, judge, sentence, report, NEVER_USE, DISCLAIMER } from './vaastu.js'

test('north up: the NE corner cell is Ishanya, SW is Nairrutya-side, the middle is Brahmasthan', () => {
  assert.equal(zoneOf(0, 8).id8, 'NE'); assert.equal(zoneOf(0, 8).zone8.name, 'Ishanya')
  assert.equal(zoneOf(8, 0).id8, 'SW'); assert.equal(zoneOf(0, 4).id8, 'N'); assert.equal(zoneOf(4, 8).id8, 'E')
  assert.equal(zoneOf(4, 4).id8, 'center'); assert.ok(isCenter(3, 5)); assert.ok(!isCenter(2, 4))
})
test('rotating north by 90 degrees rotates the zones with it', () => {
  // north points to the plan's right: the right-hand middle cell is north, the top middle is west
  assert.equal(zoneOf(4, 8, 90).id8, 'N'); assert.equal(zoneOf(0, 4, 90).id8, 'W'); assert.equal(zoneOf(0, 8, 90).id8, 'NW')
  assert.equal(zoneOf(0, 8, 90).id16, 'NW'); assert.ok(Math.abs(bearingOf(0, 4, 90) - 270) < 1e-9)
})
test('16-zone ring is centred on the compass points', () => {
  assert.equal(zoneOf(0, 4).id16, 'N'); assert.equal(zoneOf(0, 5).id16, 'NNE'); assert.equal(zoneOf(0, 7).id16, 'NE'); assert.equal(zoneOf(2, 8).id16, 'ENE')
})
test('entrance on pada N3 (Mukhya) is favoured; N1 is not', () => {
  const a = entrance('N', 3); assert.equal(a.pada, 'Mukhya'); assert.ok(a.favoured); assert.match(a.text, /favours/)
  assert.ok(!entrance('N', 1).favoured); assert.equal(entrance('Q', 1), null)
})
test('the tradition is quoted, never a verdict: no forbidden words in any sentence', () => {
  const funcs = ['kitchen', 'toilet', 'prayer', 'bedroom', 'staircase', 'office']
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) for (const f of funcs) {
    const s = sentence(f, zoneOf(r, c)).toLowerCase()
    for (const bad of NEVER_USE) assert.ok(!s.includes(bad), `"${bad}" in: ${s}`)
    assert.match(s, /^the tradition/)
  }
  for (const bad of NEVER_USE) assert.ok(!DISCLAIMER.toLowerCase().includes(bad))
})
test('judge: prayer is recommended in the NE; a kitchen is avoided in the N', () => {
  assert.equal(judge('prayer', zoneOf(0, 8)), 'recommended'); assert.equal(judge('kitchen', zoneOf(0, 4)), 'avoided')
})
test('report keeps one line per tagged room', () => {
  const r = report([{ func: 'prayer', row: 0, col: 8 }, { func: 'kitchen', row: 8, col: 8 }], 0, entrance('N', 3))
  assert.equal(r.lines.length, 2); assert.ok(r.entrance.favoured)
})
