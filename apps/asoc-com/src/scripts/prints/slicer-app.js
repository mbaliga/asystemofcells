// The slicer page's application code. Imported lazily by slicer-boot.js after the first file is chosen,
// so the page itself stays light and three.js + the Worker load only now.
import { createPlate, hasWebGL } from './plate.js'
import { quotePrint, TABLES } from '../../../../../api/counter/_quote.js'
import handoff from '../../../../../data/handoff.json'

const VOLUME = TABLES.pricing.buildVolumeMm
const HEX = { 'Jade White': 0xe8ebe3, Black: 0x2b2b2d, Grey: 0x8d9094, 'Bambu Green': 0x3f9c6b, Orange: 0xe8742c, Translucent: 0xd6e4ea }
const $ = (id) => document.getElementById(id)
const inr = (n) => '₹' + Number(Math.round(n)).toLocaleString('en-IN')
const mins = (m) => (m >= 90 ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min` : `${Math.round(m)} min`)
// Desaturate 20 % so the preview colour reads as lit matter, not a swatch (07 §2).
const soft = (hex) => { const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255, l = 0.3 * r + 0.59 * g + 0.11 * b; const mix = (c) => Math.round(c * 0.8 + l * 0.2); return (mix(r) << 16) | (mix(g) << 8) | mix(b) }

const state = { file: null, bytes: null, name: '', ext: '', fits: true, fitScale: null, est: null, stats: null, loadedAt: Date.now(), reqId: 0, plate: null }
const worker = new Worker(new URL('./slicer.worker.js', import.meta.url), { type: 'module' })

function settings() {
  return { layerHeight: Number($('layer').value), infillPct: Number($('infill').value), supports: $('supports').value, filament: $('filament').value }
}
function colourHex() { return soft(HEX[$('colour').value] ?? 0xd9d9d6) }

function fillColours() {
  const f = TABLES.pricing.filaments.find((x) => x.id === $('filament').value)
  $('colour').replaceChildren(...f.colours.map((c) => new Option(c, c)))
}

function renderQuote() {
  const box = $('quote')
  if (!state.est) { box.textContent = 'Estimating…'; return }
  const e = state.est, tier = document.querySelector('input[name=tier]:checked').value, qty = Math.max(1, Math.min(50, Number($('qty').value) || 1))
  const zone = $('country').value.trim().toUpperCase() === 'IN' || !$('country').value ? 'IN' : 'INTL'
  const q = quotePrint({ est: e, tier, qty, filament: $('filament').value, zone })
  state.quote = q
  const rows = [['Material and machine', q.subtotal], [`Finish (${TABLES.tiers.tiers.find((t) => t.id === tier).name})`, q.finish], ['Packaging', q.packaging], [`Shipping (${zone === 'IN' ? 'India' : 'international'})`, q.shipping]]
  box.replaceChildren(...rows.map(([k, v]) => { const d = document.createElement('div'); d.className = 'row'; const a = document.createElement('span'); a.textContent = k; const b = document.createElement('span'); b.textContent = inr(v); d.append(a, b); return d }))
  const t = document.createElement('div'); t.className = 'row total'; t.innerHTML = '<span>Estimate</span><span></span>'; t.lastChild.textContent = inr(q.total); box.append(t)
  $('bandNote').textContent = TABLES.tiers.surfaceCopy.band.replace('{band}', `${Math.round((e.band ?? 0.2) * 100)} % (about ${inr(q.bandInr)})`)
  $('orderTotal').textContent = inr(q.total)
}

function renderFacts() {
  const e = state.est, s = state.stats
  const big = state.bbox ? Math.max(...state.bbox.size) : 0
  $('unitHint').textContent = !big ? '' : big < 5 ? 'This is very small. If it should be bigger, the file may be in inches or metres; scale it up in your modelling tool.' : big > 1000 ? 'This is enormous. If it should be smaller, the file may be in microns or metres; scale it down in your modelling tool.' : ''
  $('fits').textContent = state.fits ? 'Fits the plate.' : 'Does not fit the plate (it is grey).'
  $('fits').dataset.ok = state.fits ? '1' : '0'
  $('fitBtn').hidden = state.fits || !state.fitScale
  if (!e) return
  $('facts').textContent = `About ${e.massG.toFixed(1)} g · ${mins(e.printMin)} · ${e.supportsNeeded ? 'supports likely' : 'no supports needed'}` + (s && !s.manifold ? ' · the mesh has open edges' : '') + (e.printMin > TABLES.pricing.maxPrintMinutesWithoutReview ? ' · a long print, the quote may be revised' : '')
}

function requestEstimate() {
  state.est = null; renderQuote()
  worker.postMessage({ type: 'estimate', id: ++state.reqId, settings: settings() })
}
let debounce
const later = () => { clearTimeout(debounce); debounce = setTimeout(requestEstimate, 150) }

worker.onmessage = (e) => {
  const m = e.data
  if (m.type === 'error') { $('error').textContent = m.message; $('error').hidden = false; return }
  if (m.type === 'loaded' || m.type === 'transformed') {
    $('error').hidden = true
    state.fits = m.fits; state.fitScale = m.fitScale; state.bbox = m.bbox
    if (state.plate) state.plate.setModel(m.pos, m.fits, colourHex())
    $('tris').textContent = `${m.tris.toLocaleString('en-IN')} triangles · ${m.bbox.size.map((v) => v.toFixed(1)).join(' × ')} mm`
    $('workspace').hidden = false
    renderFacts(); requestEstimate()
  } else if (m.type === 'estimated' && m.id === state.reqId) {
    state.est = m.est; state.stats = m.stats; renderFacts(); renderQuote()
  }
}

export async function start(file) {
  state.file = file; state.name = file.name; state.bytes = await file.arrayBuffer(); state.loadedAt = Date.now()
  $('fileName').textContent = file.name
  if (!state.plate && hasWebGL()) state.plate = createPlate($('plate'), { volume: VOLUME, dark: !matchMedia('(prefers-color-scheme: light)').matches })
  if (!hasWebGL()) { $('plate').hidden = true; $('noGl').hidden = false }
  worker.postMessage({ type: 'load', buf: state.bytes.slice(0), name: file.name, volume: VOLUME })
}

// ---- wiring ----------------------------------------------------------------------------
fillColours()
$('filament').addEventListener('change', () => { fillColours(); state.plate && state.plate.setColour(colourHex()); later() })
$('colour').addEventListener('change', () => state.plate && state.plate.setColour(colourHex()))
for (const id of ['layer', 'infill', 'supports']) $(id).addEventListener('change', later)
for (const el of document.querySelectorAll('input[name=tier]')) el.addEventListener('change', renderQuote)
for (const id of ['qty', 'country']) $(id).addEventListener('input', renderQuote)
$('layFlat').addEventListener('click', () => worker.postMessage({ type: 'transform', op: 'layFlat', volume: VOLUME }))
$('rotate').addEventListener('click', () => worker.postMessage({ type: 'transform', op: 'rotate', volume: VOLUME }))
$('fitBtn').addEventListener('click', () => state.fitScale && worker.postMessage({ type: 'transform', op: 'scale', factor: state.fitScale * 0.999, volume: VOLUME }))
$('recentre').addEventListener('click', () => state.plate && state.plate.recentre())
$('another').addEventListener('click', () => $('file').click())

// Downloads: the model exactly as it came in, and a brief for whoever slices it.
const save = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000) }
$('dlModel').addEventListener('click', () => save(new Blob([state.bytes]), state.name))
$('dlBrief').addEventListener('click', async () => {
  const brief = { note: 'Estimates from the browser, not a slice. Slice the model in your own slicer.', model: { name: state.name, bytes: state.bytes.byteLength, sha256: await sha256(state.bytes) }, settings: settings(), estimate: state.est && { massG: state.est.massG, printMin: state.est.printMin, supportsLikely: state.est.supportsNeeded, band: state.est.band }, printer: { name: 'Bambu Lab A1 mini', buildVolumeMm: VOLUME, nozzleMm: TABLES.pricing.nozzleMm } }
  save(new Blob([JSON.stringify(brief, null, 2)], { type: 'application/json' }), 'print-brief.json')
})

async function sha256(buf) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map((b) => b.toString(16).padStart(2, '0')).join('') }

// ---- order: the model leaves this device only when this button is pressed ----------------------
$('orderForm').addEventListener('submit', async (ev) => {
  ev.preventDefault()
  const btn = ev.submitter || $('orderForm').querySelector('button[type=submit]'), msg = $('orderMsg')
  if (!state.est) { msg.textContent = 'Wait for the estimate first.'; return }
  btn.disabled = true; msg.textContent = 'Placing the order…'
  try {
    const f = new FormData($('orderForm')), hash = await sha256(state.bytes), zone = String(f.get('country')).toUpperCase() === 'IN' ? 'IN' : 'INTL'
    const tier = document.querySelector('input[name=tier]:checked').value, qty = Math.max(1, Math.min(50, Number($('qty').value) || 1))
    const key = sessionStorage.getItem('asoc-print-key') || ('p' + crypto.randomUUID().replace(/-/g, '')); sessionStorage.setItem('asoc-print-key', key)
    const e = state.est
    const body = {
      kind: 'print', idempotencyKey: key, startedAt: state.loadedAt, website: f.get('website') || '',
      customer: { name: f.get('name'), email: f.get('email'), phone: f.get('phone') || '' },
      shipTo: { line1: f.get('line1'), line2: f.get('line2') || '', city: f.get('city'), state: f.get('state'), postcode: f.get('postcode'), country: String(f.get('country')).toUpperCase() },
      items: [{ model: { name: state.name, ext: state.name.split('.').pop().toLowerCase(), bytes: state.bytes.byteLength, sha256: hash }, settings: settings(), estimate: { massG: e.massG, printMin: e.printMin, supports: e.supportsNeeded, manifold: state.stats ? state.stats.manifold : true }, tier, qty, colour: $('colour').value, filament: $('filament').value }],
      clientQuote: { total: quotePrint({ est: e, tier, qty, filament: $('filament').value, zone }).total }, note: f.get('note') || '',
    }
    const res = await fetch('/api/counter/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((j.error && j.error.message) || 'The order did not go through.')
    if (j.upload) {
      msg.textContent = 'Sending the model…'
      const up = await fetch(j.upload.url, { method: 'PUT', headers: j.upload.headers, body: state.bytes })
      if (!up.ok) throw new Error('The model could not be uploaded. Nothing was charged. Try again.')
      const at = await fetch(`/api/counter/orders/${j.id}/model?t=${encodeURIComponent(j.token)}`, { method: 'PUT' })
      if (!at.ok) throw new Error('The model arrived but could not be confirmed. Try again; your order is safe.')
    }
    sessionStorage.removeItem('asoc-print-key')
    location.href = j.statusUrl
  } catch (err) { msg.textContent = err.message || 'Something went wrong. Nothing was charged.'; btn.disabled = false }
})

// Handoff routes (data/handoff.json): shown only when the owner has enabled them.
const routes = Object.entries(handoff.routes).filter(([k, r]) => r.enabled && k !== 'orderHere' && k !== 'alloyApp' && k !== 'bambuHandyLocal')
$('selfRoutes').replaceChildren(...routes.map(([, r]) => { const li = document.createElement('li'); li.textContent = r.label + (r.note ? ` — ${r.note}` : ''); return li }))
if (handoff.routes.bambuHandyLocal.enabled) { const li = document.createElement('li'); li.textContent = handoff.routes.bambuHandyLocal.label; $('selfRoutes').append(li) }
