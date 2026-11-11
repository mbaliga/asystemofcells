import { bindSite, getSite, loadRose } from './site.js'
import { $, svg } from './dom.js'
import { SEASONS, SEASON_LABEL, SECTOR_NAMES, sectorBands, prevailing, faceReadings } from './wind.js'

let site = getSite(), rose = null
$('season').replaceChildren(...Object.keys(SEASONS).map((k) => new Option(SEASON_LABEL[k], k)))
$('season').value = 'monsoon'
const GREYS = ['#c9ced3', '#9aa3ab', '#69737c', '#3a424a'] // luminance steps, never hue alone

function drawRose() {
  const root = $('rose'); root.replaceChildren()
  if (!rose) return
  const months = SEASONS[$('season').value]
  const { bands, calm, meanSpeed, totals } = sectorBands(rose, months)
  const maxT = Math.max(...totals), scale = 0.88 / maxT
  const defs = svg('defs', {}, root)
  const pat = svg('pattern', { id: 'hatch', width: 0.04, height: 0.04, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs)
  svg('rect', { width: 0.04, height: 0.04, fill: GREYS[3] }, pat); svg('line', { x1: 0, y1: 0, x2: 0, y2: 0.04, stroke: '#fff', 'stroke-width': 0.012 }, pat)
  for (const r of [0.25, 0.5, 0.75]) svg('circle', { cx: 0, cy: 0, r: r * 0.88 / 0.75 * (0.75 / 1), fill: 'none', stroke: 'currentColor', 'stroke-opacity': 0.1 }, root)
  const wedge = (a0, a1, r0, r1) => { const p = (a, r) => [r * Math.sin((a * Math.PI) / 180), -r * Math.cos((a * Math.PI) / 180)]; const [x0, y0] = p(a0, r1), [x1, y1] = p(a1, r1), [x2, y2] = p(a1, r0), [x3, y3] = p(a0, r0); return `M${x0},${y0}A${r1},${r1} 0 0 1 ${x1},${y1}L${x2},${y2}A${r0},${r0} 0 0 0 ${x3},${y3}Z` }
  bands.forEach((row, s) => { let r0 = 0; row.forEach((v, b) => { const r1 = r0 + v * scale; if (v > 0) svg('path', { d: wedge(s * 22.5 - 9.5, s * 22.5 + 9.5, r0, r1), fill: b === 3 ? 'url(#hatch)' : GREYS[b], stroke: '#fff', 'stroke-width': 0.004 }, root); r0 = r1 }) })
  for (const [t, a] of [['N', 0], ['E', 90], ['S', 180], ['W', 270]]) { const e = svg('text', { x: 1.0 * Math.sin((a * Math.PI) / 180), y: -1.0 * Math.cos((a * Math.PI) / 180) + 0.03, 'text-anchor': 'middle', 'font-size': 0.085, fill: 'currentColor' }, root); e.textContent = t }
  const pv = prevailing(rose, months)
  $('rose-note').textContent = `${SEASON_LABEL[$('season').value]}: wind comes most often from the ${pv.name} (${pv.pct.toFixed(0)} % of hours). Calm ${calm.toFixed(0)} % of hours, mean speed ${meanSpeed.toFixed(1)} m/s.`
  const leg = $('legend'); leg.replaceChildren(...rose.bands.map((b, i) => { const li = document.createElement('li'); li.textContent = `${b} m/s` + (i === 3 ? ' (hatched)' : ''); li.style.borderLeft = `10px solid ${GREYS[i]}`; li.style.paddingLeft = '8px'; return li }))
  drawFaces(pv)
}

function drawFaces(pv) {
  const open = Object.fromEntries(['front', 'right', 'back', 'left'].map((f) => [f, $('open-' + f).checked]))
  const rot = Number($('prot').value) || 0
  const r = faceReadings(pv.deg, rot, open)
  const tb = $('faces'); tb.replaceChildren(...r.faces.map((f) => { const tr = document.createElement('tr'); for (const t of [f.name, `${Math.round(f.normal)}°`, f.side, f.open ? 'open' : 'closed']) { const td = document.createElement('td'); td.textContent = t; tr.append(td) } return tr }))
  $('through').textContent = r.text
  const root = $('plan'); root.replaceChildren()
  const g = svg('g', { transform: `rotate(${rot})` }, root)
  svg('rect', { x: -0.3, y: -0.2, width: 0.6, height: 0.4, fill: 'currentColor', 'fill-opacity': 0.12, stroke: 'currentColor' }, g)
  r.faces.forEach((f, i) => { const a = i * 90, x = Math.sin((a * Math.PI) / 180), y = -Math.cos((a * Math.PI) / 180); const t = svg('text', { x: x * (i % 2 ? 0.42 : 0.3), y: y * (i % 2 ? 0.42 : 0.3) + 0.02, 'text-anchor': 'middle', 'font-size': 0.07, fill: 'currentColor' }, g); t.textContent = f.name + (f.open ? ' ○' : '') })
  const a = pv.deg, ax = Math.sin((a * Math.PI) / 180), ay = -Math.cos((a * Math.PI) / 180)
  svg('path', { d: `M${ax * 0.95},${ay * 0.95} L${ax * 0.58},${ay * 0.58}`, stroke: 'currentColor', 'stroke-width': 0.03, 'marker-end': '' }, root)
  svg('path', { d: `M${ax * 0.58 - ay * 0.05 + ax * 0.0},${ay * 0.58 + ax * 0.05} L${ax * 0.5},${ay * 0.5} L${ax * 0.58 + ay * 0.05},${ay * 0.58 - ax * 0.05}Z`, fill: 'currentColor' }, root)
  const n = svg('text', { x: 0, y: -1.05, 'text-anchor': 'middle', 'font-size': 0.08, fill: 'currentColor' }, root); n.textContent = 'N'
}

async function reload() {
  rose = site.slug ? await loadRose(site.slug) : null
  $('norose').hidden = !!rose
  drawRose()
}
for (const id of ['season', 'prot', 'open-front', 'open-right', 'open-back', 'open-left']) $(id).addEventListener('input', () => { if (rose) drawRose() })
bindSite((s) => { site = s; reload() })
