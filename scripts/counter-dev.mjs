#!/usr/bin/env node
// Local dev server: serves the built site (apps/asoc-com/dist) and mounts the
// Counter functions from api/counter/ with the in-memory ledger and fakes.
//   pnpm build && node scripts/counter-dev.mjs   -> http://localhost:8788
// Dev owner token is open (no COUNTER_OWNER_TOKEN set). Nothing here talks to Razorpay, ntfy or mail.
import http from 'node:http'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, extname, resolve, relative } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const DIST = join(ROOT, 'apps/asoc-com/dist')
const API = join(ROOT, 'api/counter')
const PORT = Number(process.env.PORT || 8788)
process.env.SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`
process.env.DEV_UPLOAD_BASE = `http://localhost:${PORT}`
process.env.CATALOG_URL = process.env.CATALOG_URL || `http://localhost:${PORT}/cabinet/catalog.json`

// File-based routes: api/counter/a/[id]/b.js -> /api/counter/a/:id/b
async function routes(dir = API, base = '/api/counter') {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('_') || e.name === '__tests__' || e.name === 'package.json') continue
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await routes(p, `${base}/${e.name}`)))
    else if (e.name.endsWith('.js')) out.push({ file: p, pattern: `${base}/${e.name.slice(0, -3)}` })
  }
  return out.map((r) => ({ ...r, parts: r.pattern.split('/') }))
}
const table = await routes()
const match = (path) => {
  const segs = path.replace(/\/$/, '').split('/')
  for (const r of table) {
    if (r.parts.length !== segs.length) continue
    const q = {}
    if (r.parts.every((p, i) => (p.startsWith('[') ? ((q[p.slice(1, -1)] = decodeURIComponent(segs[i])), true) : p === segs[i]))) return { r, q }
  }
  return null
}
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.xml': 'application/xml' }

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  if (req.method === 'PUT' && url.pathname.startsWith('/dev-upload/')) { // stands in for the presigned R2 URL
    const chunks = []; for await (const c of req) chunks.push(c)
    const { ctx } = await import(pathToFileURL(join(API, '_ctx.js')).href)
    ;(await ctx()).storage.put(decodeURIComponent(url.pathname.slice('/dev-upload/'.length)), Buffer.concat(chunks).length)
    res.statusCode = 200; return res.end()
  }
  if (url.pathname.startsWith('/api/counter')) {
    const m = match(url.pathname)
    if (!m) { res.statusCode = 404; return res.end('{}') }
    req.query = { ...Object.fromEntries(url.searchParams), ...m.q }
    const mod = await import(pathToFileURL(m.r.file).href)
    res.status = (c) => { res.statusCode = c; return res }
    return mod.default(req, res)
  }
  let p = join(DIST, decodeURIComponent(url.pathname))
  if (!resolve(p).startsWith(DIST)) { res.statusCode = 403; return res.end() }
  try { if ((await stat(p)).isDirectory()) p = join(p, 'index.html') } catch { p = p + (extname(p) ? '' : '/index.html') }
  try { const buf = await readFile(p); res.setHeader('Content-Type', TYPES[extname(p)] || 'application/octet-stream'); res.end(buf) }
  catch { res.statusCode = 404; res.end('not found') }
}).listen(PORT, () => console.log(`counter dev: http://localhost:${PORT} (site + /api/counter, in-memory ledger)`))
