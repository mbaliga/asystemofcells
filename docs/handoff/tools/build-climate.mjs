#!/usr/bin/env node
// build-climate.mjs — OWNER-RUN, BUILD-TIME ONLY. Bakes monthly climate normals for the Mahoney tables
// (Koenigsberger, Manual of Tropical Housing, Part 1) from NASA POWER climatology into data/climate/<slug>.json:
//   tMax  monthly mean of daily maximum temperature, °C   (T2M_MAX)
//   tMin  monthly mean of daily minimum temperature, °C   (T2M_MIN)
//   rhMean monthly mean relative humidity, %               (RH2M)
//   rain  monthly rainfall, mm (PRECTOTCORR mm/day x days)
//
//   node docs/handoff/tools/build-climate.mjs --sites docs/handoff/tools/wind-sites.json --out data/climate
import { writeFile, mkdir, readFile } from 'node:fs/promises'
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => { if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1]]); return a }, []))
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export async function fetchClimate({ lat, lon }) {
  const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M_MAX,T2M_MIN,RH2M,PRECTOTCORR&community=RE&latitude=${lat}&longitude=${lon}&format=JSON`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`POWER ${res.status}`)
  const p = (await res.json()).properties.parameter
  const r1 = (x) => Math.round(x * 10) / 10
  return {
    source: { provider: 'NASA POWER', temporal: 'climatology', params: ['T2M_MAX', 'T2M_MIN', 'RH2M', 'PRECTOTCORR'], fetched: new Date().toISOString() },
    months: MON.map((m, i) => ({ tMax: r1(p.T2M_MAX[m]), tMin: r1(p.T2M_MIN[m]), rhMean: r1(p.RH2M[m]), rain: r1(p.PRECTOTCORR[m] * DAYS[i]) })),
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sites = JSON.parse(await readFile(args.sites, 'utf8'))
  await mkdir(args.out, { recursive: true })
  for (const s of sites) {
    try {
      const c = await fetchClimate(s)
      await writeFile(`${args.out}/${s.slug}.json`, JSON.stringify({ slug: s.slug, name: s.name, lat: s.lat, lon: s.lon, ...c }) + '\n')
      console.log('ok', s.slug)
    } catch (e) { console.error('FAIL', s.slug, e.message) }
  }
}
