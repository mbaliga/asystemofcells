// Plate placement: pure functions on a triangle soup (Float32Array, mm). Z is up; the plate is z = 0.
export const bbox = (pos) => {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { const v = pos[i + k]; if (v < min[k]) min[k] = v; if (v > max[k]) max[k] = v }
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] }
}

/** Centre in XY on the plate and rest on z = 0. Returns a new array. */
export function placeOnPlate(pos, volume = { x: 180, y: 180, z: 180 }) {
  const b = bbox(pos), out = new Float32Array(pos.length)
  const dx = volume.x / 2 - (b.min[0] + b.max[0]) / 2, dy = volume.y / 2 - (b.min[1] + b.max[1]) / 2, dz = -b.min[2]
  for (let i = 0; i < pos.length; i += 3) { out[i] = pos[i] + dx; out[i + 1] = pos[i + 1] + dy; out[i + 2] = pos[i + 2] + dz }
  return out
}

export const scaled = (pos, f) => Float32Array.from(pos, (v) => v * f)

/** Rotate by 90° steps about Z. */
export function rotateZ(pos, quarters = 1) {
  const out = new Float32Array(pos.length), q = ((quarters % 4) + 4) % 4
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i + 1]
    const [nx, ny] = q === 0 ? [x, y] : q === 1 ? [-y, x] : q === 2 ? [-x, -y] : [y, -x]
    out[i] = nx; out[i + 1] = ny; out[i + 2] = pos[i + 2]
  }
  return out
}

function rotateFromTo(pos, a, b) { // Rodrigues: rotate unit vector a onto b
  const v = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  if (c > 0.999999) return Float32Array.from(pos)
  let R
  if (c < -0.999999) R = [1, 0, 0, 0, -1, 0, 0, 0, -1] // 180° about X
  else {
    const k = 1 / (1 + c)
    R = [1 - k * (v[1] ** 2 + v[2] ** 2), -v[2] + k * v[0] * v[1], v[1] + k * v[0] * v[2], v[2] + k * v[0] * v[1], 1 - k * (v[0] ** 2 + v[2] ** 2), -v[0] + k * v[1] * v[2], -v[1] + k * v[0] * v[2], v[0] + k * v[1] * v[2], 1 - k * (v[0] ** 2 + v[1] ** 2)]
  }
  const out = new Float32Array(pos.length)
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i + 1], z = pos[i + 2]
    out[i] = R[0] * x + R[1] * y + R[2] * z; out[i + 1] = R[3] * x + R[4] * y + R[5] * z; out[i + 2] = R[6] * x + R[7] * y + R[8] * z
  }
  return out
}

/** "Lay flat": the planar face group with the most area goes down. */
export function layFlat(pos) {
  const groups = new Map()
  for (let i = 0; i < pos.length; i += 9) {
    const ux = pos[i + 3] - pos[i], uy = pos[i + 4] - pos[i + 1], uz = pos[i + 5] - pos[i + 2]
    const vx = pos[i + 6] - pos[i], vy = pos[i + 7] - pos[i + 1], vz = pos[i + 8] - pos[i + 2]
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    const a2 = Math.hypot(nx, ny, nz); if (a2 < 1e-12) continue
    const n = [nx / a2, ny / a2, nz / a2]
    const key = n.map((c) => Math.round(c * 50)).join(',') // ~1° buckets
    const g = groups.get(key) || { area: 0, n: [0, 0, 0] }
    g.area += a2 / 2; for (let k = 0; k < 3; k++) g.n[k] += n[k] * (a2 / 2)
    groups.set(key, g)
  }
  let best = null
  for (const g of groups.values()) if (!best || g.area > best.area) best = g
  if (!best) return Float32Array.from(pos)
  const len = Math.hypot(...best.n), n = best.n.map((c) => c / len)
  return rotateFromTo(pos, n, [0, 0, -1])
}

/** Fits the build volume (with a small tolerance for float noise)? */
export function fits(pos, volume = { x: 180, y: 180, z: 180 }, tol = 0.01) {
  const b = bbox(pos)
  return b.size[0] <= volume.x + tol && b.size[1] <= volume.y + tol && b.size[2] <= volume.z + tol
}

/** Uniform scale that would make it fit, or null if it already does / would shrink by more than maxShrink. */
export function scaleToFit(pos, volume, maxShrink = 0.1) {
  const b = bbox(pos)
  const f = Math.min(volume.x / b.size[0], volume.y / b.size[1], volume.z / b.size[2])
  return f >= 1 ? null : f >= 1 - maxShrink ? f : null
}
