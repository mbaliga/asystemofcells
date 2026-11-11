import { bindSite } from './site.js'
import { $, svg } from './dom.js'
import { zoneOf, zoneName, FUNCTIONS, report, entrance, DISCLAIMER, isCenter, data } from './vaastu.js'

let northDeg = 0
const tags = new Map() // "r,c" -> function
$('func').replaceChildren(...FUNCTIONS.map((f) => new Option(f, f)))

function draw() {
  const root = $('grid'); root.replaceChildren()
  const S = 9, C = 1 / S
  const rot = svg('g', {}, root)
  const img = $('planimg').dataset.src
  if (img) svg('image', { href: img, x: 0, y: 0, width: 1, height: 1, preserveAspectRatio: 'xMidYMid slice', opacity: 0.55 }, rot)
  for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) {
    const z = zoneOf(r, c, northDeg), key = `${r},${c}`
    const g = svg('g', { tabindex: 0, role: 'button', 'aria-label': `${zoneName(z)}${tags.has(key) ? ', ' + tags.get(key) : ''}` }, rot)
    svg('rect', { x: c * C, y: r * C, width: C, height: C, fill: isCenter(r, c) ? 'currentColor' : 'transparent', 'fill-opacity': isCenter(r, c) ? 0.08 : 1, 'pointer-events': 'all', style: 'cursor:pointer', stroke: 'currentColor', 'stroke-opacity': 0.25, 'stroke-width': 0.003 }, g)
    if (tags.has(key)) { const t = svg('text', { x: c * C + C / 2, y: r * C + C / 2 + 0.01, 'text-anchor': 'middle', 'font-size': 0.022, fill: 'currentColor' }, g); t.textContent = tags.get(key).slice(0, 9) }
    const pick = () => { if (tags.get(key) === $('func').value) tags.delete(key); else tags.set(key, $('func').value); draw(); list() }
    g.addEventListener('click', pick); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick() } })
  }
  // zone names on the perimeter, turned with north
  for (const id of ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']) {
    const bearing = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 }[id], a = ((bearing + northDeg) * Math.PI) / 180
    const z = data.zones8.find((q) => q.id === id)
    const t = svg('text', { x: 0.5 + 0.56 * Math.sin(a), y: 0.5 - 0.56 * Math.cos(a) + 0.01, 'text-anchor': 'middle', 'font-size': 0.034, fill: 'currentColor', 'fill-opacity': 0.75 }, root); t.textContent = `${id} · ${z.name}`
  }
}

function list() {
  const ent = entrance($('eside').value, Number($('eidx').value))
  const rep = report([...tags].map(([k, func]) => { const [row, col] = k.split(',').map(Number); return { func, row, col } }), northDeg, ent)
  const ul = $('report'); ul.replaceChildren(...rep.lines.map((l) => { const li = document.createElement('li'); li.textContent = l.text; return li }))
  if (ent) { const li = document.createElement('li'); li.textContent = ent.text; ul.append(li) }
  if (!rep.lines.length && !ent) ul.replaceChildren(Object.assign(document.createElement('li'), { textContent: 'Choose a room, then press the cells it covers.' }))
  $('ask').href = '/architecture/commission/?plan=' + encodeURIComponent(JSON.stringify({ tool: 'vaastu', northDeg, tags: [...tags], entrance: ent && { side: ent.side, index: ent.index } }))
}

$('planfile').addEventListener('change', () => { const f = $('planfile').files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { $('planimg').dataset.src = r.result; draw() }; r.readAsDataURL(f) }) // read in this browser; never uploaded
for (const id of ['eside', 'eidx']) $(id).addEventListener('input', list)
$('clear').addEventListener('click', () => { tags.clear(); draw(); list() })
$('print').addEventListener('click', () => print())
$('disclaimer').textContent = DISCLAIMER
bindSite((s) => { northDeg = s.northDeg || 0; draw(); list() })
