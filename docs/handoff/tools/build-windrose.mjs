#!/usr/bin/env node
// build-windrose.mjs — OWNER-RUN, BUILD-TIME ONLY. Bakes monthly 16-sector wind roses for a list of
// sites from NASA POWER hourly WS10M/WD10M (2015–2024) into data/windroses/<slug>.json.
// The visitor page never calls the network unless they press the marked cloud button, which
// then runs the same `fetchRose()` for an arbitrary point.
//
//   node tools/build-windrose.mjs --sites tools/wind-sites.json --out apps/asoc-com/src/data/windroses
//
// POWER docs: https://power.larc.nasa.gov/docs/services/api/temporal/hourly/
import { writeFile, mkdir, readFile } from 'node:fs/promises'

const SECTORS = 16, SPEED_BANDS = [2, 4, 6, 9, Infinity]  // m/s edges: calm<2, 2–4, 4–6, 6–9, >9
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => { if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1]]); return a }, []))

export async function fetchRose({ lat, lon, start = '20150101', end = '20241231' }) {
  const url = `https://power.larc.nasa.gov/api/temporal/hourly/point?parameters=WS10M,WD10M&community=RE&latitude=${lat}&longitude=${lon}&start=${start}&end=${end}&format=JSON&time-standard=LST`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`POWER ${res.status}`)
  const j = await res.json()
  const ws = j.properties.parameter.WS10M, wd = j.properties.parameter.WD10M
  // months[m] = { sectors: [[count per band]...16], calm, n }
  const months = Array.from({ length: 12 }, () => ({ sectors: Array.from({ length: SECTORS }, () => Array(SPEED_BANDS.length - 1).fill(0)), calm: 0, n: 0, meanSpeed: 0 }))
  for (const key of Object.keys(ws)) {
    const m = parseInt(key.slice(4, 6), 10) - 1
    const s = ws[key], d = wd[key]
    if (s == null || d == null || s < 0 || s === -999) continue
    const M = months[m]; M.n++; M.meanSpeed += s
    if (s < SPEED_BANDS[0]) { M.calm++; continue }
    const sector = Math.round(((d % 360) + 360) % 360 / (360 / SECTORS)) % SECTORS
    const band = SPEED_BANDS.findIndex((edge, i) => i > 0 && s < edge) - 1
    M.sectors[sector][Math.max(0, band)]++
  }
  return {
    source: { provider: 'NASA POWER', params: ['WS10M', 'WD10M'], temporal: 'hourly', start, end, fetched: new Date().toISOString() },
    lat, lon, sectors: SECTORS, bands: ['2–4', '4–6', '6–9', '>9'], calmBelow: SPEED_BANDS[0], unit: 'm/s',
    months: months.map(M => ({ n: M.n, calmPct: M.n ? +(100 * M.calm / M.n).toFixed(2) : 0, meanSpeed: M.n ? +(M.meanSpeed / M.n).toFixed(2) : 0,
      pct: M.sectors.map(b => b.map(c => M.n ? +(100 * c / M.n).toFixed(3) : 0)) })),
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sites = JSON.parse(await readFile(args.sites || 'tools/wind-sites.json', 'utf8'))
  const out = args.out || 'data/windroses'; await mkdir(out, { recursive: true })
  for (const s of sites) {
    process.stdout.write(`${s.slug} … `)
    try { const rose = await fetchRose(s); await writeFile(`${out}/${s.slug}.json`, JSON.stringify({ ...s, ...rose })); console.log('ok') }
    catch (e) { console.log('failed:', e.message) }
  }
}
