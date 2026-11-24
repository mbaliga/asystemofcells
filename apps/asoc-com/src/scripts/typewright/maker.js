// Typewright's online monoline font maker (desktop only). Draw each letter with
// one constant stroke, space them, and download an installable TrueType font.
// Everything runs in this page; nothing is uploaded.
import { simplify, strokesToContours, bounds } from './outline.js'
import { buildTtf } from './ttf.js'

const $ = (id) => document.getElementById(id)
const gate = window.matchMedia('(min-width: 1024px) and (pointer: fine)')
const KEY = 'asoc.typewright.maker.v1'

const SETS = {
  'A to Z': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'a to z': 'abcdefghijklmnopqrstuvwxyz',
  '0 to 9': '0123456789',
  'Marks': '.,:;!?-–—\'"()&@#/',
}

const S = { // state
  family: 'My Typewright Font', copyright: '', width: 70, snap: true, upm: 1000,
  asc: 800, desc: -200, xh: 500, cap: 700, side: 60, adv: 500,
  glyphs: {}, // cp -> { strokes, advance, redo }
  order: [], cur: 0x41,
  under: { src: null, opacity: 0.35, scale: 1, x: 0, y: 0 },
}

const cpOf = (ch) => ch.codePointAt(0)
const chOf = (cp) => String.fromCodePoint(cp)
const hex = (cp) => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0')

function ensure(cp) {
  if (!S.glyphs[cp]) { S.glyphs[cp] = { strokes: [], advance: S.adv, redo: [] }; S.order.push(cp) }
  return S.glyphs[cp]
}
function addChars(str) {
  const bad = []
  for (const ch of str) {
    if (/\s/.test(ch)) continue
    const cp = cpOf(ch)
    if (cp > 0xffff) { bad.push(ch); continue }
    ensure(cp)
  }
  S.order.sort((a, b) => a - b)
  return bad
}

function save() { try { const { under, ...rest } = S; localStorage.setItem(KEY, JSON.stringify(rest)) } catch { /* private mode */ } }
function load() {
  try { const r = JSON.parse(localStorage.getItem(KEY) || 'null'); if (r && r.glyphs) Object.assign(S, r) } catch { /* ignore */ }
}

// ---- drawing surface --------------------------------------------------------
const svg = $('tw-svg')
const NS = 'http://www.w3.org/2000/svg'
const mk = (tag, attrs = {}) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n }
let drawing = null

function pt(e) {
  const m = svg.getScreenCTM().inverse()
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m)
  let x = p.x, y = -p.y
  if (S.snap) { x = Math.round(x / 10) * 10; y = Math.round(y / 10) * 10 }
  return [x, y]
}

function renderSurface() {
  const g = ensure(S.cur)
  const pad = 140, x0 = -pad, w = g.advance + pad * 2, top = S.asc + 120, bot = S.desc - 120
  svg.setAttribute('viewBox', `${x0} ${-top} ${w} ${top - bot}`)
  svg.replaceChildren()
  if (S.under.src) svg.append(mk('image', { href: S.under.src, x: S.under.x, y: -S.under.y - 700 * S.under.scale, height: 700 * S.under.scale, opacity: S.under.opacity, preserveAspectRatio: 'xMinYMin meet' }))
  const line = (y, cls) => svg.append(mk('line', { x1: x0, x2: x0 + w, y1: -y, y2: -y, class: cls }))
  line(0, 'tw-base'); line(S.xh, 'tw-guide'); line(S.cap, 'tw-guide'); line(S.asc, 'tw-guide'); line(S.desc, 'tw-guide')
  svg.append(mk('line', { x1: 0, x2: 0, y1: -top, y2: -bot, class: 'tw-guide' }), mk('line', { x1: g.advance, x2: g.advance, y1: -top, y2: -bot, class: 'tw-adv' }))
  const style = `stroke-width:${S.width}`
  for (const s of g.strokes) svg.append(mk('polyline', { points: s.map(([x, y]) => `${x},${-y}`).join(' '), class: 'tw-stroke', style }))
  if (drawing) svg.append(mk('polyline', { points: drawing.map(([x, y]) => `${x},${-y}`).join(' '), class: 'tw-stroke tw-live', style }))
  $('tw-cur').textContent = `${chOf(S.cur)}  ${hex(S.cur)}`
  $('tw-adv').value = g.advance
}

svg.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; e.preventDefault(); getSelection()?.removeAllRanges(); svg.setPointerCapture(e.pointerId); drawing = [pt(e)]; renderSurface() })
svg.addEventListener('pointermove', (e) => {
  if (!drawing) return
  const p = pt(e), l = drawing[drawing.length - 1]
  if (Math.hypot(p[0] - l[0], p[1] - l[1]) >= 4) { drawing.push(p); renderSurface() }
})
function endStroke() {
  if (!drawing) return
  const g = ensure(S.cur)
  g.strokes.push(S.snap ? drawing : simplify(drawing, 3)); g.redo = []
  drawing = null; changed()
}
svg.addEventListener('pointerup', endStroke)
svg.addEventListener('pointercancel', () => { drawing = null; renderSurface() })

// ---- glyph grid -------------------------------------------------------------
function thumb(cp) {
  const g = S.glyphs[cp]
  const c = document.createElement('canvas'); c.width = 56; c.height = 64
  const x = c.getContext('2d'), k = 64 / (S.asc - S.desc + 80), ox = (56 - g.advance * k) / 2, oy = (S.asc + 40) * k
  x.strokeStyle = '#f0ede6'; x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = Math.max(1, S.width * k)
  for (const s of g.strokes) { x.beginPath(); s.forEach(([px, py], i) => (i ? x.lineTo(ox + px * k, oy - py * k) : x.moveTo(ox + px * k, oy - py * k))); if (s.length === 1) x.lineTo(ox + s[0][0] * k + 0.1, oy - s[0][1] * k); x.stroke() }
  return c
}
function renderGrid() {
  const grid = $('tw-grid'); grid.replaceChildren()
  for (const cp of S.order) {
    const g = S.glyphs[cp]
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'tw-cell' + (cp === S.cur ? ' is-cur' : '') + (g.strokes.length ? ' is-done' : '')
    b.title = hex(cp); b.setAttribute('aria-label', `${chOf(cp)} ${hex(cp)}${g.strokes.length ? ', drawn' : ', empty'}`)
    const lab = document.createElement('span'); lab.textContent = chOf(cp)
    b.append(thumb(cp), lab)
    b.addEventListener('click', () => { S.cur = cp; renderGrid(); renderSurface() })
    grid.append(b)
  }
  const done = S.order.filter((cp) => S.glyphs[cp].strokes.length).length
  $('tw-count').textContent = `${done} of ${S.order.length} drawn`
}

// ---- font + preview ---------------------------------------------------------
function fontGlyphs() {
  const out = S.order.filter((cp) => S.glyphs[cp].strokes.length || cp === 0x20).map((cp) => ({ cp, advance: S.glyphs[cp].advance, contours: strokesToContours(S.glyphs[cp].strokes, S.width) }))
  if (!out.some((g) => g.cp === 0x20)) out.push({ cp: 0x20, advance: Math.round(S.adv * 0.6), contours: [] })
  return out
}
const opts = () => ({ family: S.family, copyright: S.copyright, upm: S.upm, ascent: S.asc, descent: S.desc, xHeight: S.xh, capHeight: S.cap })
let face = null, timer = 0
function preview() {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    const out = $('tw-prev'), msg = $('tw-msg')
    try {
      if (!S.order.some((cp) => S.glyphs[cp].strokes.length)) { msg.textContent = 'Draw a letter to see the font.'; return }
      const buf = buildTtf(opts(), fontGlyphs())
      const f = new FontFace('TWPreview', buf)
      await f.load()
      if (face) document.fonts.delete(face)
      document.fonts.add(f); face = f
      out.style.fontFamily = "'TWPreview', sans-serif"
      msg.textContent = ''
    } catch (e) { msg.textContent = `Could not build the font: ${e.message}` }
  }, 250)
}
function changed() { save(); renderSurface(); renderGrid(); preview() }

// ---- controls ---------------------------------------------------------------
function bind(id, key, parse = (v) => v, after) {
  const el = $(id); el.value = S[key]
  el.addEventListener('input', () => { S[key] = parse(el.value); (after || changed)() })
}
const num = (v) => (Number.isFinite(+v) ? +v : 0)
function init() {
  load()
  if (!S.order.length) addChars(SETS['A to Z'] + SETS['a to z'] + SETS['0 to 9'])
  if (!S.glyphs[S.cur]) S.cur = S.order[0]
  bind('tw-family', 'family'); bind('tw-copy', 'copyright'); bind('tw-width', 'width', num); bind('tw-xh', 'xh', num); bind('tw-cap', 'cap', num); bind('tw-asc', 'asc', num); bind('tw-desc', 'desc', num); bind('tw-side', 'side', num, save)
  $('tw-snap').checked = S.snap; $('tw-snap').addEventListener('change', (e) => { S.snap = e.target.checked; save() })
  $('tw-adv').addEventListener('input', (e) => { ensure(S.cur).advance = Math.max(0, num(e.target.value)); changed() })
  $('tw-undo').addEventListener('click', () => { const g = ensure(S.cur); const s = g.strokes.pop(); if (s) { g.redo.push(s); changed() } })
  $('tw-redo').addEventListener('click', () => { const g = ensure(S.cur); const s = g.redo.pop(); if (s) { g.strokes.push(s); changed() } })
  $('tw-clear').addEventListener('click', () => { const g = ensure(S.cur); if (g.strokes.length && confirm(`Clear ${chOf(S.cur)}?`)) { g.strokes = []; g.redo = []; changed() } })
  $('tw-space').addEventListener('click', () => { // advance = ink width + side bearings, ink shifted to the left bearing
    for (const cp of S.order) {
      const g = S.glyphs[cp]; const b = bounds(strokesToContours(g.strokes, S.width)); if (!b) continue
      const dx = S.side - b.x0
      g.strokes = g.strokes.map((s) => s.map(([x, y]) => [x + dx, y])); g.advance = Math.round(b.x1 - b.x0 + S.side * 2)
    }
    changed()
  })
  $('tw-add').addEventListener('submit', (e) => {
    e.preventDefault(); const f = $('tw-chars'); const bad = addChars(f.value)
    $('tw-addmsg').textContent = bad.length ? `Skipped ${bad.join(' ')}: outside the Basic Multilingual Plane, which this maker does not write.` : ''
    const first = [...f.value].find((c) => cpOf(c) <= 0xffff && !/\s/.test(c)); if (first) S.cur = cpOf(first)
    f.value = ''; changed()
  })
  const sets = $('tw-sets'); for (const k in SETS) { const b = document.createElement('button'); b.type = 'button'; b.className = 'tw-btn'; b.textContent = `+ ${k}`; b.addEventListener('click', () => { addChars(SETS[k]); changed() }); sets.append(b) }
  $('tw-under').addEventListener('change', (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { S.under.src = r.result; renderSurface() }; r.readAsDataURL(f) })
  for (const [id, k] of [['tw-uo', 'opacity'], ['tw-us', 'scale'], ['tw-ux', 'x'], ['tw-uy', 'y']]) $(id).addEventListener('input', (e) => { S.under[k] = num(e.target.value); renderSurface() })
  $('tw-clear-under').addEventListener('click', () => { S.under.src = null; renderSurface() })
  $('tw-text').addEventListener('input', (e) => { $('tw-prev').textContent = e.target.value })
  $('tw-prev').textContent = $('tw-text').value
  $('tw-ttf').addEventListener('click', () => {
    try { download(`${(S.family.replace(/[^A-Za-z0-9]+/g, '-') || 'font')}.ttf`, buildTtf(opts(), fontGlyphs()), 'font/ttf'); $('tw-msg').textContent = '' } catch (e) { $('tw-msg').textContent = e.message }
  })
  $('tw-save').addEventListener('click', () => { const { under, ...rest } = S; download(`${S.family.replace(/[^A-Za-z0-9]+/g, '-')}.typewright.json`, JSON.stringify(rest), 'application/json') })
  $('tw-open').addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; try { const r = JSON.parse(await f.text()); if (!r.glyphs) throw new Error('not a Typewright project'); Object.assign(S, r); document.querySelectorAll('#tw-form input[id]').forEach((el) => { const k = { 'tw-family': 'family', 'tw-copy': 'copyright', 'tw-width': 'width', 'tw-xh': 'xh', 'tw-cap': 'cap', 'tw-asc': 'asc', 'tw-desc': 'desc', 'tw-side': 'side' }[el.id]; if (k) el.value = S[k] }); changed() } catch (err) { $('tw-msg').textContent = `Could not open the project: ${err.message}` } })
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $('tw-undo').click() } })
  changed()
}
function download(name, data, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

let started = false
function check() {
  const ok = gate.matches
  $('tw-app').hidden = !ok; $('tw-nope').hidden = ok
  if (ok && !started) { started = true; init() }
}
gate.addEventListener('change', check); check()
