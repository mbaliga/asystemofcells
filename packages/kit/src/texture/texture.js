/*
 * texture.js - the house grainy-gradient engine.
 *
 * This is the rendering core of the owner-authored generator that ships at
 * /tools/texture-background.html, lifted out verbatim in behaviour so the site
 * and the tool draw with the same code instead of the site approximating the
 * tool in CSS. The /tools page claims "these are the same generators wired
 * into the site itself"; before this module that claim was false, and the home
 * backdrop was radial-gradient washes plus an feTurbulence tile at 7% opacity,
 * which cannot reproduce per-pixel grain composited in soft-light.
 *
 * Framework-free and dependency-free on purpose: an Astro island, a plain
 * <script>, or the standalone tool page can all use it.
 */

/* ------------------------------------------------------------------ colour */

export function hexToRgb(hex) {
  const h = String(hex).trim().replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex({ r, g, b }) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export function rgbToHsl({ r, g, b }) {
  const R = r / 255
  const G = g / 255
  const B = b / 255
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === R) h = ((G - B) / d + (G < B ? 6 : 0)) / 6
    else if (max === G) h = ((B - R) / d + 2) / 6
    else h = ((R - G) / d + 4) / 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

export function hslToRgb({ h, s, l }) {
  const H = ((h % 360) + 360) % 360 / 360
  const S = Math.max(0, Math.min(100, s)) / 100
  const L = Math.max(0, Math.min(100, l)) / 100
  if (S === 0) return { r: L * 255, g: L * 255, b: L * 255 }
  const q = L < 0.5 ? L * (1 + S) : L + S - L * S
  const p = 2 * L - q
  const hue = (t) => {
    let T = t
    if (T < 0) T += 1
    if (T > 1) T -= 1
    if (T < 1 / 6) return p + (q - p) * 6 * T
    if (T < 1 / 2) return q
    if (T < 2 / 3) return p + (q - p) * (2 / 3 - T) * 6
    return p
  }
  return { r: hue(H + 1 / 3) * 255, g: hue(H) * 255, b: hue(H - 1 / 3) * 255 }
}

/*
 * Derive a three-stop palette from one accent, holding the shape of the
 * owner's reference values (#7B6CF6 -> #99C1F1 -> #FFFFFF). Measured against
 * that reference, the middle stop sits about 38 degrees back around the wheel,
 * a little less saturated, and a little lighter, and the last stop is white.
 * Applying the same deltas to any accent gives every product a version of the
 * same look rather than a differently-shaped gradient per product.
 *
 * The rotation is negative (analogous, not complementary) so the middle stop
 * always stays a neighbour of the accent: violet goes to blue, pink to purple,
 * orange to rose. A complementary rotation would read as two unrelated colours.
 */
export function paletteFromAccent(accent) {
  const hsl = rgbToHsl(hexToRgb(accent))
  const mid = hslToRgb({
    h: hsl.h - 38,
    s: hsl.s * 0.85,
    // The reference's middle stop is a genuinely pale colour (L 77). Matching
    // that as a floor rather than a plain offset is what keeps the composition
    // airy for accents that are darker than the reference violet: Clackpad's
    // orange is L 57, and a mere +10 leaves a heavy stop that swamps the frame.
    // The floor also rescues very dark, very grey accents (Hyle's #4A4A55, L 31)
    // that would otherwise give a middle stop indistinguishable from the first.
    l: Math.min(84, Math.max(hsl.l + 12, 68)),
  })
  return [accent, rgbToHex(mid), '#ffffff']
}

/*
 * Where the three stops sit along the gradient line.
 *
 * The tool spaces stops evenly, which puts the midpoint at 50% and leaves the
 * white end confined to one corner. In the owner's reference frame the violet
 * is saturated only in the top-right corner, has already become pale blue by
 * about a third of the way across, and the remaining two thirds ramp to white.
 * Front-loading the middle stop reproduces that, and it is also what keeps dark
 * type legible: the type all sits in the white end of the frame.
 */
export const REFERENCE_STOPS = [0, 0.35, 1]

export const DEFAULTS = {
  fill: 'linear',
  angle: 135,
  colors: ['#7b6cf6', '#99c1f1', '#ffffff'],
  texType: 'grain',
  grain: 40,
  // The tool's slider is in tenths: 10 means 1.0x.
  scale: 10,
  vig: 0,
  motion: 'none',
  speed: 50,
}

/* ------------------------------------------------------------------- noise */

/*
 * Keyed by dimensions. The tool keeps a single-slot cache, which thrashes if
 * two sizes alternate; a Map costs nothing here and a responsive background
 * genuinely does alternate sizes across resizes.
 */
const noiseCache = new Map()

function buildNoise(w, h) {
  const key = `${w}x${h}`
  const hit = noiseCache.get(key)
  if (hit) return hit
  const nc = document.createElement('canvas')
  nc.width = w
  nc.height = h
  const nx = nc.getContext('2d')
  const img = nx.createImageData(w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.random() * 255
    d[i] = d[i + 1] = d[i + 2] = v
    d[i + 3] = 255
  }
  nx.putImageData(img, 0, 0)
  // Bounded so a long session resizing repeatedly cannot grow without limit.
  if (noiseCache.size > 6) noiseCache.delete(noiseCache.keys().next().value)
  noiseCache.set(key, nc)
  return nc
}

/* ------------------------------------------------------------------ render */

/*
 * Draws one frame into `canvas` at w x h. `t` is elapsed seconds, used only by
 * the motion modes. Behaviourally identical to the tool's render(), with the
 * state object passed in rather than read from a module global.
 */
export function renderTexture(canvas, w, h, opts, t = 0) {
  const s = { ...DEFAULTS, ...opts }
  const c = canvas
  if (c.width !== w) c.width = w
  if (c.height !== h) c.height = h
  const g = c.getContext('2d')
  const cols = s.colors
  const spd = s.speed / 50
  const m = s.motion

  let angleOffset = 0
  let driftX = 0
  let driftY = 0
  let pulsePhase = 1
  let noiseOffX = 0
  let noiseOffY = 0
  if (m === 'rotate') angleOffset = t * 10 * spd
  if (m === 'drift') {
    driftX = Math.sin(t * 0.5 * spd) * 0.08 * w
    driftY = Math.cos(t * 0.4 * spd) * 0.08 * h
  }
  if (m === 'pulse') pulsePhase = 0.85 + 0.15 * Math.sin(t * 1.2 * spd)
  if (m === 'shimmer') {
    noiseOffX = (t * 40 * spd) % 1000
    noiseOffY = (t * 27 * spd) % 1000
  }

  /*
   * `stops` is an extension over the tool, which always spaces evenly. Omit it
   * and the behaviour is identical to the tool's; pass it to weight the ramp.
   */
  const addStops = (grad) => {
    const positions = Array.isArray(s.stops) && s.stops.length === cols.length ? s.stops : null
    cols.forEach((col, i) => {
      const at = positions ? positions[i] : cols.length > 1 ? i / (cols.length - 1) : 0
      grad.addColorStop(Math.max(0, Math.min(1, at)), col)
    })
  }

  if (s.fill === 'solid') {
    g.fillStyle = cols[0]
    g.fillRect(0, 0, w, h)
  } else if (s.fill === 'linear') {
    const a = ((s.angle + angleOffset) * Math.PI) / 180
    const x = Math.cos(a)
    const y = Math.sin(a)
    const cx = w / 2 + driftX
    const cy = h / 2 + driftY
    const len = (Math.abs(x) * w + Math.abs(y) * h) / 2
    const grad = g.createLinearGradient(cx - x * len, cy - y * len, cx + x * len, cy + y * len)
    addStops(grad)
    g.fillStyle = grad
    g.fillRect(0, 0, w, h)
  } else if (s.fill === 'radial') {
    const cx = w / 2 + driftX
    const cy = h / 2 + driftY
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, (Math.max(w, h) / 1.4) * pulsePhase)
    addStops(grad)
    g.fillStyle = grad
    g.fillRect(0, 0, w, h)
  } else if (s.fill === 'mesh') {
    g.fillStyle = cols[cols.length - 1]
    g.fillRect(0, 0, w, h)
    const spots = [[0.25, 0.3], [0.75, 0.35], [0.5, 0.8], [0.15, 0.75], [0.85, 0.75]]
    g.globalCompositeOperation = 'lighter'
    cols.forEach((col, i) => {
      let [sx, sy] = spots[i % spots.length]
      if (m === 'wave') {
        sx += Math.sin(t * 0.6 * spd + i * 1.7) * 0.09
        sy += Math.cos(t * 0.5 * spd + i * 2.1) * 0.09
      } else if (m === 'drift') {
        sx += (driftX / w) * 0.6
        sy += (driftY / h) * 0.6
      } else if (m === 'rotate') {
        const cx0 = sx - 0.5
        const cy0 = sy - 0.5
        const ang = ((angleOffset * Math.PI) / 180) * 0.3
        sx = 0.5 + cx0 * Math.cos(ang) - cy0 * Math.sin(ang)
        sy = 0.5 + cx0 * Math.sin(ang) + cy0 * Math.cos(ang)
      }
      const r = Math.max(w, h) * 0.55 * (m === 'pulse' ? pulsePhase : 1)
      const rg = g.createRadialGradient(w * sx, h * sy, 0, w * sx, h * sy, r)
      rg.addColorStop(0, col)
      rg.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = rg
      g.fillRect(0, 0, w, h)
    })
    g.globalCompositeOperation = 'source-over'
  }

  if (s.texType !== 'none' && s.grain > 0) {
    const scale = s.scale / 10
    const nw = Math.max(2, Math.round(w / scale))
    const nh = Math.max(2, Math.round(h / scale))
    const noise = buildNoise(nw, nh)
    g.save()
    g.globalAlpha = (s.grain / 100) * (s.texType === 'fine' ? 0.5 : s.texType === 'noise' ? 0.85 : 0.65)
    g.globalCompositeOperation = s.texType === 'noise' ? 'overlay' : 'soft-light'
    g.imageSmoothingEnabled = s.texType !== 'grain'
    if (m === 'shimmer') {
      const ox = noiseOffX % nw
      const oy = noiseOffY % nh
      g.drawImage(noise, (-ox / nw) * w, (-oy / nh) * h, w, h)
      g.drawImage(noise, w - (ox / nw) * w, (-oy / nh) * h, w, h)
      g.drawImage(noise, (-ox / nw) * w, h - (oy / nh) * h, w, h)
      g.drawImage(noise, w - (ox / nw) * w, h - (oy / nh) * h, w, h)
    } else {
      g.drawImage(noise, 0, 0, w, h)
    }
    g.restore()
  }

  if (s.vig > 0) {
    const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72)
    vg.addColorStop(0, 'rgba(0,0,0,0)')
    vg.addColorStop(1, `rgba(0,0,0,${(s.vig / 100) * 0.85})`)
    g.fillStyle = vg
    g.fillRect(0, 0, w, h)
  }
  return c
}

/* ------------------------------------------------------------------- mount */

function lerpPalette(from, to, k) {
  const n = Math.max(from.length, to.length)
  const out = []
  for (let i = 0; i < n; i++) {
    const a = hexToRgb(from[Math.min(i, from.length - 1)])
    const b = hexToRgb(to[Math.min(i, to.length - 1)])
    out.push(rgbToHex({ r: a.r + (b.r - a.r) * k, g: a.g + (b.g - a.g) * k, b: a.b + (b.b - a.b) * k }))
  }
  return out
}

/*
 * Mounts a full-bleed animated canvas as the first child of `el`, and returns
 * handles to drive it. `el` needs a positioning context; the canvas is
 * absolutely positioned and pointer-events:none, so it never intercepts clicks.
 *
 * Deliberate performance choices, because this is a full-viewport surface that
 * redraws rather than a static image:
 *
 * - Backing store is sized in CSS pixels, not device pixels. At scale 1.0 the
 *   tool draws one noise pixel per canvas pixel, so a devicePixelRatio-sized
 *   store would quadruple the work AND halve the apparent grain size relative
 *   to what the tool's own preview shows. CSS-pixel sizing is both cheaper and
 *   the closer match to the reference.
 * - Frame rate is capped (default 24fps). Rotate at the reference speed moves
 *   10 degrees per second; nothing about that needs 60fps, and a background has
 *   no business spending a whole frame budget.
 * - Rendering stops entirely when the tab is hidden or the element scrolls out
 *   of view, and prefers-reduced-motion draws exactly one static frame.
 */
export function mountTextureBackdrop(el, options = {}) {
  const {
    accent = null,
    palette = null,
    fps = 24,
    transitionMs = 750,
    className = 'texture-backdrop',
    ...rest
  } = options

  const opts = { ...DEFAULTS, ...rest }
  let current = palette || (accent ? paletteFromAccent(accent) : opts.colors)
  let from = current
  let to = current
  let tweenStart = 0

  const canvas = document.createElement('canvas')
  canvas.className = className
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
    pointerEvents: 'none',
  })
  el.prepend(canvas)

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  let w = 0
  let h = 0
  let raf = null
  let start = null
  let lastFrame = 0
  let visible = true
  let onScreen = true

  function measure() {
    const r = el.getBoundingClientRect()
    w = Math.max(1, Math.round(r.width))
    h = Math.max(1, Math.round(r.height))
  }

  function paint(t) {
    let cols = to
    if (tweenStart && transitionMs > 0) {
      const k = Math.min(1, (performance.now() - tweenStart) / transitionMs)
      cols = lerpPalette(from, to, k)
      if (k >= 1) {
        tweenStart = 0
        current = to
      }
    }
    renderTexture(canvas, w, h, { ...opts, colors: cols }, t)
  }

  function still() {
    measure()
    paint(0)
  }

  function loop(now) {
    raf = requestAnimationFrame(loop)
    if (now - lastFrame < 1000 / fps) return
    lastFrame = now
    if (start === null) start = now
    paint((now - start) / 1000)
  }

  function running() {
    return visible && onScreen && !reduced.matches && opts.motion !== 'none'
  }

  function sync() {
    if (running()) {
      if (!raf) raf = requestAnimationFrame(loop)
    } else if (raf) {
      cancelAnimationFrame(raf)
      raf = null
      // Land on a drawn frame rather than whatever was mid-flight.
      paint(start === null ? 0 : (performance.now() - start) / 1000)
    }
  }

  measure()
  paint(0)
  sync()

  const ro = new ResizeObserver(() => {
    measure()
    if (!running()) paint(0)
  })
  ro.observe(el)

  const onVis = () => {
    visible = !document.hidden
    sync()
  }
  document.addEventListener('visibilitychange', onVis)

  let io = null
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((entries) => {
      onScreen = entries.some((e) => e.isIntersecting)
      sync()
    })
    io.observe(el)
  }

  const onReduced = () => {
    sync()
    if (reduced.matches) still()
  }
  reduced.addEventListener('change', onReduced)

  return {
    canvas,
    setAccent(hex) {
      this.setPalette(paletteFromAccent(hex))
    },
    setPalette(next) {
      from = current
      to = next
      tweenStart = performance.now()
      if (!running()) {
        // Drive the tween to completion by hand when the loop is parked.
        const step = () => {
          const k = Math.min(1, (performance.now() - tweenStart) / transitionMs)
          renderTexture(canvas, w, h, { ...opts, colors: lerpPalette(from, to, k) }, 0)
          if (k < 1 && !running()) requestAnimationFrame(step)
          else if (k >= 1) {
            current = to
            tweenStart = 0
          }
        }
        step()
      }
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      if (io) io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      reduced.removeEventListener('change', onReduced)
      canvas.remove()
    },
  }
}
