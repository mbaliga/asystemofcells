import { bindSite, loadClimate, zonedInstant } from './site.js'
import { $, svg, blob } from './dom.js'
import { mahoney, shadowAngles, isShaded, overhangDepth } from './tropical.js'
import { sunPosition } from './sunpath.js'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
let months = null, site = null
const INDS = [['H1', 'Air movement essential'], ['H2', 'Air movement desirable'], ['H3', 'Rain protection necessary'], ['A1', 'Thermal capacity necessary'], ['A2', 'Outdoor sleeping desirable'], ['A3', 'Protection from cold']]

function editor() {
  const tb = $('inputs'); tb.replaceChildren()
  months.forEach((m, i) => {
    const tr = document.createElement('tr'); const th = document.createElement('th'); th.scope = 'row'; th.textContent = MON[i]; tr.append(th)
    for (const k of ['tMax', 'tMin', 'rhMean', 'rain']) { const td = document.createElement('td'); const inp = document.createElement('input'); inp.type = 'number'; inp.step = '0.1'; inp.value = m[k]; inp.setAttribute('aria-label', `${MON[i]} ${k}`); inp.addEventListener('change', () => { m[k] = Number(inp.value); compute() }); td.append(inp); tr.append(td) }
    tb.append(tr)
  })
}

function compute() {
  const r = mahoney(months)
  $('amt').textContent = `Annual mean temperature ${r.amt.toFixed(1)} °C`
  const g = $('grid'); g.replaceChildren()
  const W = 38, H = 26, X0 = 150, Y0 = 34
  g.setAttribute('viewBox', `0 0 ${X0 + 12 * W + 20} ${Y0 + INDS.length * H + 40}`)
  MON.forEach((m, i) => { const t = svg('text', { x: X0 + i * W + W / 2, y: 22, 'text-anchor': 'middle', 'font-size': 12, fill: 'currentColor' }, g); t.textContent = m })
  INDS.forEach(([id, label], j) => {
    const y = Y0 + j * H; const t = svg('text', { x: 4, y: y + 17, 'font-size': 12, fill: 'currentColor' }, g); t.textContent = `${id} ${label}`
    r.rows.forEach((row, i) => { const cx = X0 + i * W + W / 2; if (row.indicators[id]) { blob(g, cx, y + 13, 7, {}); const s = svg('title', {}, g); s.textContent = `${MON[i]}: ${label}` } else svg('circle', { cx, cy: y + 13, r: 2, fill: 'currentColor', 'fill-opacity': 0.25 }, g) })
    const tot = svg('text', { x: X0 + 12 * W + 4, y: y + 17, 'font-size': 12, 'font-weight': 600, fill: 'currentColor' }, g); tot.textContent = r.totals[id]
  })
  $('totals').textContent = INDS.map(([id]) => `${id} ${r.totals[id]}`).join(' · ')
  shading(r)
}

function shading(r) {
  const wall = Number($('wall').value) || 180, h = Number($('winh').value) || 1.2, lat = site.lat, lon = site.lon
  const hot = r.rows.map((x, i) => (x.day === 'H' ? i : -1)).filter((i) => i >= 0)
  const tb = $('shade'); tb.replaceChildren()
  if (!hot.length) { $('shadeNote').textContent = 'No month is hot by day at this site, so there is no overheated period to shade.'; return }
  $('shadeNote').textContent = ''
  for (const i of hot) {
    let minV = Infinity, lit = 0
    const dateStr = `2026-${String(i + 1).padStart(2, '0')}-21`
    for (let hr = 9; hr <= 15; hr++) { // the 21st of the month, 09:00 to 15:00 local
      const p = sunPosition({ lat, lon, date: zonedInstant(dateStr, hr * 60, site.tz) })
      const a = shadowAngles(wall, p); if (a.lit) { lit++; minV = Math.min(minV, a.vsa) }
    }
    const tr = document.createElement('tr')
    for (const t of [MON[i], lit ? `${lit} of 7 hours` : 'the sun is behind this wall', lit ? `${minV.toFixed(0)}°` : '—', lit ? `${overhangDepth(h, minV).toFixed(2)} m` : '—']) { const td = document.createElement('td'); td.textContent = t; tr.append(td) }
    tb.append(tr)
  }
}

async function reload() {
  const c = site.slug ? await loadClimate(site.slug) : null
  $('noclimate').hidden = !!c
  if (c) months = c.months.map((m) => ({ ...m }))
  else if (!months) months = Array.from({ length: 12 }, () => ({ tMax: 30, tMin: 20, rhMean: 60, rain: 50 }))
  editor(); compute()
}
for (const id of ['wall', 'winh']) $(id).addEventListener('input', () => months && compute())
bindSite((s) => { site = s; reload() })
