#!/usr/bin/env node
// Local dev server: serves the built site (apps/asoc-com/dist) and mounts the
// Counter functions from api/counter/ with the in-memory ledger and fakes.
//   pnpm build && node scripts/counter-dev.mjs   -> http://localhost:8788
// Dev owner token is open (no COUNTER_OWNER_TOKEN set). Nothing here talks to Razorpay, ntfy or mail.
import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, resolve, relative } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const DIST = join(ROOT, 'apps/asoc-com/dist')
const API = join(ROOT, 'api/counter')
const PORT = Number(process.env.PORT || 8788)
process.env.SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`
process.env.DEV_UPLOAD_BASE = `http://localhost:${PORT}`
process.env.CATALOG_URL = process.env.CATALOG_URL || `http://localhost:${PORT}/cabinet/catalog.json`

import { dispatch } from '../api/counter/_router.js'
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
    return dispatch(req, res) // the same router the one Vercel function uses
  }
  let p = join(DIST, decodeURIComponent(url.pathname))
  if (!resolve(p).startsWith(DIST)) { res.statusCode = 403; return res.end() }
  try { if ((await stat(p)).isDirectory()) p = join(p, 'index.html') } catch { p = p + (extname(p) ? '' : '/index.html') }
  try { const buf = await readFile(p); res.setHeader('Content-Type', TYPES[extname(p)] || 'application/octet-stream'); res.end(buf) }
  catch { res.statusCode = 404; res.end('not found') }
}).listen(PORT, () => console.log(`counter dev: http://localhost:${PORT} (site + /api/counter, in-memory ledger)`))
