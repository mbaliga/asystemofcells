// The in-browser file viewer. Everything happens on this device: a dropped file
// is read into memory and never sent anywhere. See formats.js for what opens.
import { extOf, kindForExt, editable } from './formats.js'
import { sniff, looksLikeText } from './sniff.js'
import { listZip, readEntry } from './zip.js'
import { parseCsv, toCsv, formatJson, minifyJson, officeText, hexDump, humanSize } from './textkit.js'

const $ = (id) => document.getElementById(id)
const stage = $('v-stage'), meta = $('v-meta'), bar = $('v-bar'), drop = $('v-drop'), crumbs = $('v-crumbs')
const WARN_BYTES = 300 * 1024 * 1024
let urls = []
const stack = [] // zip breadcrumb: [{name, bytes}]

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v)
    else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v)
  }
  for (const c of kids.flat()) if (c != null) n.append(c.nodeType ? c : document.createTextNode(c))
  return n
}
const objUrl = (blob) => { const u = URL.createObjectURL(blob); urls.push(u); return u }
function reset() { urls.forEach((u) => URL.revokeObjectURL(u)); urls = []; stage.replaceChildren(); bar.replaceChildren(); meta.textContent = '' }
function save(name, data, type) {
  const a = el('a', { href: objUrl(new Blob([data], { type })), download: name })
  document.body.append(a); a.click(); a.remove()
}
const btn = (label, onclick, cls = '') => el('button', { type: 'button', class: `v-btn ${cls}`, onclick }, label)
const note = (t) => el('p', { class: 'v-note' }, t)

export async function openFile(name, bytes, origin = 'dropped') {
  reset()
  const head = bytes.subarray(0, 4096)
  const sn = sniff(head)
  const byName = extOf(name)
  const ext = sn && sn.ext !== byName && !(sn.ext === 'zip' && kindForExt(byName) === 'zip') && !(sn.ext === 'webm' && byName === 'mkv') ? sn.ext : (byName || (sn && sn.ext) || '')
  let kind = kindForExt(ext)
  if (kind === 'hex' && looksLikeText(head)) kind = 'text'
  const lines = [humanSize(bytes.length)]
  if (sn) lines.push(sn.label)
  if (sn && byName && sn.ext !== byName && kindForExt(byName) !== kindForExt(sn.ext)) lines.push(`The name says .${byName}; the contents say ${sn.label}. Opened as the contents say.`)
  meta.textContent = lines.join(' · ')
  drop.hidden = true
  crumbs.replaceChildren(...stack.map((s, i) => btn(s.name, () => back(i), 'v-crumb')), el('span', { class: 'v-here' }, name))
  crumbs.hidden = false
  if (bytes.length > WARN_BYTES) stage.append(note(`This file is ${humanSize(bytes.length)}. Large files can be slow or fail in a browser tab.`))
  const base = { name, bytes, ext }
  try {
    const fn = { image, svg, video: media, audio: media, pdf, text, json: text, csv, zip, font }[kind] || hex
    await fn(base, kind)
  } catch (e) {
    stage.append(note(`Could not open this as ${kind}: ${e.message || e}. Showing the raw bytes instead.`))
    hex(base)
  }
  bar.append(btn('Open another file', () => { stack.length = 0; reset(); crumbs.hidden = true; drop.hidden = false }, 'v-ghost'))
}
function back(i) { const t = stack[i]; stack.length = i; openFile(t.name, t.bytes) }

const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', jpe: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp', ico: 'image/x-icon', apng: 'image/apng', svg: 'image/svg+xml', mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', ogv: 'video/ogg', mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', flac: 'audio/flac', weba: 'audio/webm', pdf: 'application/pdf' }
const mime = (ext) => MIME[ext] || 'application/octet-stream'
const stem = (n) => n.replace(/\.[^.]+$/, '')

// ---- images: decode, then a small editor on a working canvas -------------
async function image({ name, bytes, ext }) {
  const bmp = await createImageBitmap(new Blob([bytes], { type: mime(ext) })).catch(() => null)
  if (!bmp) throw new Error('your browser cannot decode this image format')
  let work = document.createElement('canvas')
  work.width = bmp.width; work.height = bmp.height
  work.getContext('2d').drawImage(bmp, 0, 0)
  const view = el('canvas', { class: 'v-canvas' })
  const sel = el('div', { class: 'v-sel', hidden: true })
  const wrap = el('div', { class: 'v-canvaswrap' }, view, sel)
  const info = el('p', { class: 'v-note' })
  const draw = () => {
    view.width = work.width; view.height = work.height
    view.getContext('2d').drawImage(work, 0, 0)
    info.textContent = `${work.width} × ${work.height} px`
    sel.hidden = true; rect = null
  }
  const redraw = (fn) => { const c = document.createElement('canvas'); const r = fn(c); work = c; draw(); return r }
  const rot = (dir) => redraw((c) => { c.width = work.height; c.height = work.width; const x = c.getContext('2d'); x.translate(c.width / 2, c.height / 2); x.rotate(dir * Math.PI / 2); x.drawImage(work, -work.width / 2, -work.height / 2) })
  const flip = (h) => redraw((c) => { c.width = work.width; c.height = work.height; const x = c.getContext('2d'); x.translate(h ? c.width : 0, h ? 0 : c.height); x.scale(h ? -1 : 1, h ? 1 : -1); x.drawImage(work, 0, 0) })
  let rect = null
  const px = (e) => { const r = view.getBoundingClientRect(); return [Math.max(0, Math.min(work.width, (e.clientX - r.left) * work.width / r.width)), Math.max(0, Math.min(work.height, (e.clientY - r.top) * work.height / r.height))] }
  let start = null
  view.addEventListener('pointerdown', (e) => { start = px(e); view.setPointerCapture(e.pointerId) })
  view.addEventListener('pointermove', (e) => {
    if (!start) return
    const [x, y] = px(e)
    rect = { x: Math.min(start[0], x), y: Math.min(start[1], y), w: Math.abs(x - start[0]), h: Math.abs(y - start[1]) }
    const r = view.getBoundingClientRect(), k = r.width / work.width
    Object.assign(sel.style, { left: `${rect.x * k}px`, top: `${rect.y * k}px`, width: `${rect.w * k}px`, height: `${rect.h * k}px` })
    sel.hidden = false
  })
  view.addEventListener('pointerup', () => { start = null; if (rect && (rect.w < 4 || rect.h < 4)) { rect = null; sel.hidden = true } })
  const crop = () => { if (!rect) { info.textContent = 'Drag on the image to choose what to keep, then press Crop.'; return } const r = rect; redraw((c) => { c.width = Math.round(r.w); c.height = Math.round(r.h); c.getContext('2d').drawImage(work, -Math.round(r.x), -Math.round(r.y)) }) }
  const widthIn = el('input', { type: 'number', min: 1, max: 16000, 'aria-label': 'Width in pixels' })
  const resize = () => { const w = Math.round(+widthIn.value); if (!(w > 0 && w <= 16000)) return; const h = Math.max(1, Math.round(work.height * w / work.width)); redraw((c) => { c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(work, 0, 0, w, h) }) }
  const tone = (fn) => redraw((c) => { c.width = work.width; c.height = work.height; const x = c.getContext('2d'); x.drawImage(work, 0, 0); const id = x.getImageData(0, 0, c.width, c.height); fn(id.data); x.putImageData(id, 0, 0) })
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v)
  const bright = el('input', { type: 'range', min: -100, max: 100, value: 0, 'aria-label': 'Brightness' })
  const contrast = el('input', { type: 'range', min: -100, max: 100, value: 0, 'aria-label': 'Contrast' })
  const applyTone = () => { const b = +bright.value * 2.55, f = (259 * (+contrast.value + 255)) / (255 * (259 - +contrast.value)); tone((d) => { for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = clamp(f * (d[i + k] - 128) + 128 + b) }); bright.value = contrast.value = 0 }
  const grey = () => tone((d) => { for (let i = 0; i < d.length; i += 4) { const g = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; d[i] = d[i + 1] = d[i + 2] = g } })
  const fmt = el('select', { 'aria-label': 'Save as' }, ...['png', 'jpeg', 'webp'].map((f) => el('option', { value: f }, f.toUpperCase())))
  const q = el('input', { type: 'range', min: 40, max: 100, value: 90, 'aria-label': 'Quality' })
  const exportIt = () => work.toBlob((b) => { if (b) save(`${stem(name)}-edited.${fmt.value === 'jpeg' ? 'jpg' : fmt.value}`, b, b.type) }, `image/${fmt.value}`, +q.value / 100)
  draw()
  widthIn.value = work.width
  stage.append(wrap, info, note('Saving re-encodes the picture, which drops its metadata, including any GPS location and camera details. Animated images keep only their first frame.'))
  bar.append(
    btn('Rotate left', () => rot(-1)), btn('Rotate right', () => rot(1)), btn('Flip ↔', () => flip(true)), btn('Flip ↕', () => flip(false)), btn('Crop to selection', crop),
    el('label', { class: 'v-field' }, 'Width ', widthIn, btn('Resize', resize)),
    el('label', { class: 'v-field' }, 'Brightness ', bright), el('label', { class: 'v-field' }, 'Contrast ', contrast), btn('Apply tone', applyTone), btn('Black and white', grey),
    el('label', { class: 'v-field' }, 'Save as ', fmt), el('label', { class: 'v-field' }, 'Quality ', q), btn('Save edited copy', exportIt, 'v-primary'),
  )
}

// ---- svg: drawn as an image (scripts never run), source is editable -------
function svg({ name, bytes }) {
  const ta = el('textarea', { class: 'v-text', spellcheck: false, 'aria-label': 'SVG source' }, new TextDecoder().decode(bytes))
  const img = el('img', { class: 'v-img', alt: `Preview of ${name}` })
  let cur = ''
  const upd = () => { if (cur) URL.revokeObjectURL(cur); cur = URL.createObjectURL(new Blob([ta.value], { type: 'image/svg+xml' })); img.src = cur }
  ta.addEventListener('input', upd); upd()
  stage.append(el('div', { class: 'v-split' }, img, ta), note('The preview is drawn as a picture, so scripts inside an SVG do not run.'))
  bar.append(btn('Save SVG', () => save(name, ta.value, 'image/svg+xml'), 'v-primary'))
}

function media({ name, bytes, ext }, kind) {
  const p = el(kind === 'video' ? 'video' : 'audio', { controls: true, class: 'v-media', src: objUrl(new Blob([bytes], { type: mime(ext) })) })
  p.addEventListener('error', () => stage.append(note(`Your browser cannot play this ${ext.toUpperCase()} file. Codecs vary by browser and device.`)), { once: true })
  stage.append(p, note('Playback only. Which formats play depends on your browser.'))
}

function pdf({ name, bytes }) {
  if (navigator.pdfViewerEnabled === false) { stage.append(note('This browser has no built-in PDF viewer (many phone browsers do not). The file is not damaged; open it in a PDF app instead.')) }
  else stage.append(el('object', { class: 'v-pdf', type: 'application/pdf', data: objUrl(new Blob([bytes], { type: 'application/pdf' })), 'aria-label': name }, note('Could not show the PDF here.')), note('Viewing only. Editing PDFs is not something this tool does.'))
  bar.append(btn('Save a copy', () => save(name, bytes, 'application/pdf')))
}

// ---- text, json -----------------------------------------------------------
function text({ name, bytes, ext }, kind) {
  const ta = el('textarea', { class: 'v-text', spellcheck: false, 'aria-label': `Contents of ${name}` }, new TextDecoder().decode(bytes))
  const msg = el('p', { class: 'v-note', role: 'status' })
  stage.append(ta, msg)
  if (kind === 'json') {
    const run = (fn) => { const r = fn(ta.value); if (r.ok) { ta.value = r.text; msg.textContent = 'Valid JSON.' } else msg.textContent = `Not valid JSON: ${r.error}` }
    bar.append(btn('Format', () => run(formatJson)), btn('Minify', () => run(minifyJson)))
  }
  bar.append(btn('Save', () => save(name, ta.value, 'text/plain'), 'v-primary'))
}

function csv({ name, bytes, ext }) {
  const delim = ext === 'tsv' ? '\t' : ','
  const rows = parseCsv(new TextDecoder().decode(bytes), delim)
  const tbody = el('tbody')
  const cols = Math.max(1, ...rows.map((r) => r.length))
  const cell = (v) => el('td', {}, el('input', { value: v, 'aria-label': 'Cell' }))
  const addRow = (r) => tbody.append(el('tr', {}, ...Array.from({ length: cols }, (_, i) => cell(r[i] ?? ''))))
  rows.forEach(addRow)
  const read = () => [...tbody.rows].map((tr) => [...tr.cells].map((td) => td.firstChild.value))
  stage.append(el('div', { class: 'v-tablewrap' }, el('table', { class: 'v-grid' }, tbody)), note(`${rows.length} rows, ${cols} columns. Edit any cell.`))
  bar.append(btn('Add row', () => addRow([])), btn('Delete last row', () => tbody.lastChild && tbody.lastChild.remove()), btn('Save CSV', () => save(name, toCsv(read(), delim), 'text/csv'), 'v-primary'))
}

// ---- zip and the formats built on it -------------------------------------
async function zip({ name, bytes, ext }) {
  const entries = listZip(bytes)
  const tbody = el('tbody')
  for (const e of entries) {
    tbody.append(el('tr', {},
      el('td', {}, e.name), el('td', { class: 'v-num' }, e.dir ? '' : humanSize(e.usize)),
      el('td', {}, e.dir ? '' : e.encrypted ? 'password-protected' : el('span', {}, btn('Open', async () => { try { stack.push({ name, bytes }); await openFile(e.name.split('/').pop(), await readEntry(bytes, e)) } catch (err) { stack.pop(); alert(err.message) } }), ' ', btn('Save', async () => { try { save(e.name.split('/').pop(), await readEntry(bytes, e), 'application/octet-stream') } catch (err) { alert(err.message) } }))),
    ))
  }
  const kind = ext === 'docx' ? 'docx' : ext === 'odt' ? 'odt' : null
  if (kind) {
    const part = entries.find((e) => e.name === (kind === 'docx' ? 'word/document.xml' : 'content.xml'))
    if (part) {
      const t = officeText(new TextDecoder().decode(await readEntry(bytes, part)), kind)
      stage.append(el('h3', { class: 'v-h' }, 'Text'), el('pre', { class: 'v-pre' }, t || '(no text found)'), note('Text only. Layout, images and formatting are not shown, and this file cannot be edited here.'))
    }
  }
  stage.append(el('h3', { class: 'v-h' }, `${entries.length} items inside`), el('div', { class: 'v-tablewrap' }, el('table', { class: 'v-grid v-list' }, tbody)))
  if (ext === 'apk' || ext === 'aab' || ext === 'jar') stage.append(note('Opening an archive never runs anything inside it.'))
}

async function font({ name, bytes }) {
  const face = new FontFace('ViewerFont', bytes)
  await face.load(); document.fonts.add(face)
  const sample = el('div', { class: 'v-fontsample', contenteditable: 'true', spellcheck: 'false', 'aria-label': 'Type to try the font' }, 'The quick brown fox jumps over the lazy dog 0123456789')
  stage.append(sample, el('p', { class: 'v-fontsample v-fontsmall' }, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz'), note('Click the first line to type your own text.'))
}

let hexAt = 0
function hex({ name, bytes }) {
  const pre = el('pre', { class: 'v-pre v-hex' })
  const more = btn('Show more', () => { hexAt += 4096; render() })
  const render = () => { pre.textContent = hexDump(bytes, 0, hexAt + 4096); more.hidden = hexAt + 4096 >= bytes.length }
  hexAt = 0; render()
  stage.append(note('This format is not one the viewer can draw. Here is what is in it, byte for byte. Nothing in it is run.'), pre, more)
  bar.append(btn('Save a copy', () => save(name, bytes, 'application/octet-stream')))
}

// ---- intake ---------------------------------------------------------------
async function take(file) {
  if (!file) return
  stack.length = 0
  stage.replaceChildren(note('Reading…'))
  await openFile(file.name, new Uint8Array(await file.arrayBuffer()))
}
const input = $('v-input')
input.addEventListener('change', () => take(input.files[0]))
for (const t of ['dragenter', 'dragover']) window.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('is-over') })
for (const t of ['dragleave', 'drop']) window.addEventListener(t, (e) => { if (t === 'drop' || e.target === document.documentElement) drop.classList.remove('is-over') })
window.addEventListener('drop', (e) => { e.preventDefault(); take(e.dataTransfer.files[0]) })
