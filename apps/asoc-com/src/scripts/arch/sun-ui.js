import { sunPosition, sunriseSunset, dayTable, project } from './sunpath.js'
import { bindSite, getSite, zonedInstant, hhmm } from './site.js'
import { $, svg, blob, download } from './dom.js'

const today = new Date().toISOString().slice(0, 10)
$('date').value = $('date').value || today
let site = getSite()
const year = () => Number($('date').value.slice(0, 4)) || new Date().getFullYear()
const iso = (m, d) => `${year()}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const minutes = () => Number($('time').value)
const at = (dateStr, min) => zonedInstant(dateStr, min, site.tz)
const pos = (dateStr, min) => sunPosition({ lat: site.lat, lon: site.lon, date: at(dateStr, min) })
const mm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

// ---- stereographic sun path --------------------------------------------------------------
function drawPath() {
  const root = $('diagram'); root.replaceChildren()
  const R = 1; svg('circle', { cx: 0, cy: 0, r: R, fill: 'none', stroke: 'currentColor', 'stroke-opacity': 0.35 }, root)
  for (const el of [30, 60]) svg('circle', { cx: 0, cy: 0, r: Math.tan(((90 - el) * Math.PI) / 360), fill: 'none', stroke: 'currentColor', 'stroke-opacity': 0.12 }, root)
  for (const [t, a] of [['N', 0], ['E', 90], ['S', 180], ['W', 270]]) { const p = project(a, 0), q = { x: p.x * 1.12, y: p.y * 1.12 + 0.03 }; const e = svg('text', { x: q.x, y: q.y, 'text-anchor': 'middle', 'font-size': 0.09, fill: 'currentColor' }, root); e.textContent = t }
  const curve = (dateStr, emph) => {
    const rows = dayTable({ lat: site.lat, lon: site.lon, date: at(dateStr, 720), stepMin: 10 }).filter((r) => r.elevation >= 0)
    if (!rows.length) return
    svg('path', { d: rows.map((r, i) => { const p = project(r.azimuth, r.elevation); return `${i ? 'L' : 'M'}${p.x.toFixed(4)},${p.y.toFixed(4)}` }).join(''), fill: 'none', stroke: 'currentColor', 'stroke-width': emph ? 0.022 : 0.01, 'stroke-opacity': emph ? 0.9 : 0.4, 'stroke-dasharray': emph ? '' : '0.03 0.03' }, root)
    return rows
  }
  for (const [lbl, m, d] of [['Jun 21', 6, 21], ['Mar 20', 3, 20], ['Dec 21', 12, 21]]) curve(iso(m, d), false)
  const rows = curve($('date').value, true) || []
  const lab = svg('text', { x: -1.05, y: 1.1, 'font-size': 0.07, fill: 'currentColor', 'fill-opacity': 0.6 }, root); lab.textContent = 'dashed: Jun 21 · Mar 20 · Dec 21'
  for (const r of rows) { const loc = hhmm(r.time, site.tz); if (loc.endsWith(':00')) { const p = project(r.azimuth, r.elevation); svg('circle', { cx: p.x, cy: p.y, r: 0.012, fill: 'currentColor' }, root); const t = svg('text', { x: p.x + 0.025, y: p.y - 0.02, 'font-size': 0.055, fill: 'currentColor', 'fill-opacity': 0.7 }, root); t.textContent = String(Number(loc.slice(0, 2))) } }
  const now = pos($('date').value, minutes())
  if (now.elevation > 0) { const p = project(now.azimuth, now.elevation); blob(root, p.x, p.y, 0.05, { fill: '#E8A33D' }) }
  return now
}

// ---- shadow study on plan --------------------------------------------------------------------
const hull = (pts) => {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q) }
  const up = []; for (const q of [...p].reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q) }
  return [...lo.slice(0, -1), ...up.slice(0, -1)]
}
/** Ground shadow of a box (plan coords: x east, y north, metres) for a sun position. */
export function boxShadow(w, d, h, rotDeg, az, el) {
  const base = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, y]) => { const a = (rotDeg * Math.PI) / 180; return [x * Math.cos(a) + y * Math.sin(a), -x * Math.sin(a) + y * Math.cos(a)] })
  if (el <= 0.5) return null
  const len = h / Math.tan((el * Math.PI) / 180), dx = -Math.sin((az * Math.PI) / 180) * len, dy = -Math.cos((az * Math.PI) / 180) * len
  return hull([...base, ...base.map(([x, y]) => [x + dx, y + dy])])
}
function drawPlan(now) {
  const root = $('plan'); root.replaceChildren()
  const w = Number($('bw').value) || 10, d = Number($('bd').value) || 8, h = (Number($('storeys').value) || 1) * 3, rot = Number($('brot').value) || 0
  const polys = []
  if ($('range').checked) for (let m = 540; m <= 900; m += 60) { const p = pos($('date').value, m); const s = boxShadow(w, d, h, rot, p.azimuth, p.elevation); if (s) polys.push(['range', s]) }
  const cur = boxShadow(w, d, h, rot, now.azimuth, now.elevation); if (cur) polys.push(['now', cur])
  const foot = boxShadow(w, d, 0.001, rot, 0, 90)
  const all = polys.flatMap(([, s]) => s).concat(foot || [])
  const ext = Math.max(10, ...all.map((p) => Math.max(Math.abs(p[0]), Math.abs(p[1])))) * 1.1
  root.setAttribute('viewBox', `${-ext} ${-ext} ${2 * ext} ${2 * ext}`)
  const pt = (p) => `${p[0].toFixed(2)},${(-p[1]).toFixed(2)}`
  for (const [k, s] of polys) svg('polygon', { points: s.map(pt).join(' '), fill: 'currentColor', 'fill-opacity': k === 'now' ? 0.28 : 0.07 }, root)
  if (foot) svg('polygon', { points: foot.map(pt).join(' '), fill: 'currentColor', 'fill-opacity': 0.75 }, root)
  const n = project(0, 0); const t = svg('text', { x: 0, y: -ext * 0.9, 'text-anchor': 'middle', 'font-size': ext * 0.07, fill: 'currentColor' }, root); t.textContent = 'N ↑'
  $('planNote').textContent = now.elevation > 0 ? `Shadow of a ${w} × ${d} m block, ${h} m high, at ${mm(minutes())}.` : 'The sun is below the horizon at this time.'
}

function readout(now) {
  const rs = sunriseSunset({ lat: site.lat, lon: site.lon, date: at($('date').value, 720) })
  $('readout').textContent = `${hhmm(at($('date').value, minutes()), site.tz)} · azimuth ${now.azimuth.toFixed(1)}° · elevation ${now.elevation.toFixed(1)}°` + (rs.sunrise ? ` · sunrise ${hhmm(rs.sunrise, site.tz)} · sunset ${hhmm(rs.sunset, site.tz)}` : rs.polarNight ? ' · the sun does not rise' : ' · the sun does not set')
  $('timeLabel').textContent = mm(minutes())
}
function redraw() { const now = drawPath(); readout(now); drawPlan(now) }

for (const id of ['date', 'time', 'bw', 'bd', 'storeys', 'brot', 'range']) $(id).addEventListener('input', redraw)
$('csv').addEventListener('click', () => {
  const rows = dayTable({ lat: site.lat, lon: site.lon, date: at($('date').value, 720), stepMin: 10 })
  download(`sun-${site.name || 'site'}-${$('date').value}.csv`, 'time_local,azimuth_deg,elevation_deg\n' + rows.map((r) => `${hhmm(r.time, site.tz)},${r.azimuth.toFixed(2)},${r.elevation.toFixed(2)}`).join('\n') + '\n', 'text/csv')
})
$('png').addEventListener('click', () => {
  const s = new XMLSerializer().serializeToString($('diagram')).replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" style="color:#1d1d1f"')
  const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 1000; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1000, 1000); g.drawImage(img, 0, 0, 1000, 1000); c.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'sun-path.png'; a.click() }) }
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s)
})
bindSite((s) => { site = s; redraw() })
