export const $ = (id) => document.getElementById(id)
const NS = 'http://www.w3.org/2000/svg'
export function svg(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
  if (parent) parent.append(e)
  return e
}
/** The house cell-mark as a small organic blob (not a filled circle). */
export function blob(parent, cx, cy, r, attrs = {}) {
  const k = r * 0.55
  return svg('path', { d: `M${cx - r},${cy} C${cx - r},${cy - k} ${cx - k * 0.8},${cy - r * 1.05} ${cx + r * 0.1},${cy - r} C${cx + r * 0.9},${cy - r * 0.95} ${cx + r * 1.05},${cy - k * 0.3} ${cx + r},${cy + r * 0.1} C${cx + r * 0.95},${cy + r * 0.8} ${cx + k * 0.4},${cy + r * 1.05} ${cx - r * 0.1},${cy + r} C${cx - r * 0.8},${cy + r * 0.95} ${cx - r},${cy + k} ${cx - r},${cy}Z`, ...{ fill: 'currentColor' }, ...attrs }, parent)
}
export function download(name, text, type = 'text/plain') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
