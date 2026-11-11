// The site (place, north) is set once and shared by the architecture tools through localStorage.
import SITES from '../../../../../data/sites.json'

const KEY = 'asoc.arch.site.v1'
const climate = import.meta.glob('../../../../../data/climate/*.json')
const roses = import.meta.glob('../../../../../data/windroses/*.json')
export const DEFAULT = { slug: 'hyderabad', name: 'Hyderabad', lat: 17.385, lon: 78.4867, tz: 'Asia/Kolkata', northDeg: 0 }
export { SITES }

export function getSite() {
  try { return { ...DEFAULT, ...(JSON.parse(localStorage.getItem(KEY) || '{}')) } } catch { return { ...DEFAULT } }
}
export function setSite(patch) {
  const next = { ...getSite(), ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode: lives this page only */ }
  return next
}
const load = (map, slug) => { const k = Object.keys(map).find((p) => p.endsWith(`/${slug}.json`)); return k ? map[k]().then((m) => m.default) : Promise.resolve(null) }
export const loadClimate = (slug) => load(climate, slug)
export const loadRose = (slug) => load(roses, slug)

/** Wire the shared site form (ids siteSel, lat, lon, tz, north) and call onChange(site) on every change. */
export function bindSite(onChange) {
  const sel = document.getElementById('siteSel'), lat = document.getElementById('lat'), lon = document.getElementById('lon'), tz = document.getElementById('tz'), north = document.getElementById('north')
  const s0 = getSite()
  sel.replaceChildren(...SITES.map((x) => new Option(x.name, x.slug)), new Option('Somewhere else (type the coordinates)', ''))
  const paint = (s) => { sel.value = s.slug || ''; lat.value = s.lat; lon.value = s.lon; tz.value = s.tz; if (north) north.value = s.northDeg }
  paint(s0)
  const emit = (patch) => onChange(setSite(patch))
  sel.addEventListener('change', () => { const x = SITES.find((v) => v.slug === sel.value); emit(x ? { slug: x.slug, name: x.name, lat: x.lat, lon: x.lon } : { slug: null, name: 'Custom' }); paint(getSite()) })
  for (const el of [lat, lon]) el.addEventListener('change', () => { const la = Number(lat.value), lo = Number(lon.value); if (Math.abs(la) <= 90 && Math.abs(lo) <= 180) { emit({ slug: null, name: 'Custom', lat: la, lon: lo }); sel.value = '' } })
  tz.addEventListener('change', () => emit({ tz: tz.value.trim() || 'Asia/Kolkata' }))
  if (north) north.addEventListener('input', () => emit({ northDeg: ((Number(north.value) || 0) % 360 + 360) % 360 }))
  document.getElementById('geo')?.addEventListener('click', () => {
    if (!navigator.geolocation) return
    // A browser permission the visitor grants; nothing is sent anywhere.
    navigator.geolocation.getCurrentPosition((p) => { emit({ slug: null, name: 'Here', lat: +p.coords.latitude.toFixed(4), lon: +p.coords.longitude.toFixed(4) }); paint(getSite()) })
  })
  onChange(s0)
}

/** UTC instant for a wall-clock date/time in an IANA zone. */
export function zonedInstant(dateStr, minutes, tz) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const guess = Date.UTC(y, m - 1, d, 0, minutes)
  const off = offsetMinutes(new Date(guess), tz)
  return new Date(guess - off * 60000)
}
function offsetMinutes(date, tz) {
  try {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(date).find((x) => x.type === 'timeZoneName').value
    const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(p)
    return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0)) : 0
  } catch { return 330 }
}
export const hhmm = (date, tz) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(date)
