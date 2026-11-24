// Stroke -> outline for the monoline font maker. A glyph is a list of strokes
// (polylines of points in font units, y up). Each stroke becomes overlapping
// contours: one rectangle per segment and one round dot per vertex, all wound
// the same way, so a nonzero-winding rasteriser fills their union. Pure, no DOM.

/** Signed area (shoelace) of a closed contour, y up. Negative = clockwise. */
export function area(c) {
  let a = 0
  for (let i = 0; i < c.length; i++) {
    const [x1, y1] = c[i], [x2, y2] = c[(i + 1) % c.length]
    a += x1 * y2 - x2 * y1
  }
  return a / 2
}

// TrueType outer contours are clockwise (negative area in y-up space).
function clockwise(c) { return area(c) > 0 ? c.slice().reverse() : c }

const round = (c) => c.map(([x, y]) => [Math.round(x), Math.round(y)])

function dot(cx, cy, r, sides = 16) {
  const pts = []
  for (let i = 0; i < sides; i++) {
    const t = -(i / sides) * Math.PI * 2
    pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)])
  }
  return pts
}

/** Ramer-Douglas-Peucker. */
export function simplify(pts, eps) {
  if (pts.length < 3) return pts.slice()
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1]
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy)
  let idx = -1, max = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i]
    const d = len === 0 ? Math.hypot(px - ax, py - ay) : Math.abs(dy * px - dx * py + bx * ay - by * ax) / len
    if (d > max) { max = d; idx = i }
  }
  if (max <= eps) return [pts[0], pts[pts.length - 1]]
  const l = simplify(pts.slice(0, idx + 1), eps), r = simplify(pts.slice(idx), eps)
  return l.slice(0, -1).concat(r)
}

/** strokes: [[ [x,y], ... ], ...]; width in font units. Returns integer contours. */
export function strokesToContours(strokes, width) {
  const h = width / 2
  const out = []
  for (const s of strokes) {
    if (!s.length) continue
    for (let i = 0; i + 1 < s.length; i++) {
      const [x1, y1] = s[i], [x2, y2] = s[i + 1]
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy)
      if (len < 0.5) continue
      const nx = (-dy / len) * h, ny = (dx / len) * h
      out.push(round(clockwise([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]])))
    }
    for (const [x, y] of s) out.push(round(clockwise(dot(x, y, h))))
  }
  return out
}

export function bounds(contours) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const c of contours) for (const [x, y] of c) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  return x0 === Infinity ? null : { x0, y0, x1, y1 }
}
