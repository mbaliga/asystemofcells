#!/usr/bin/env node
// shoot-web.mjs — Lane W: capture HTML specs / web apps at device viewports with Playwright.
//
//   node tools/shoot-web.mjs --targets tools/web-targets.json --out screenshots [--serve apps/asoc-com/public]
//
// web-targets.json is an array of:
//   { "imagery": "nooz", "label": "Newsstand", "role": "hero",
//     "url": "http://localhost:4321/nooz/read/#/stand",        // or "file": "path/to/spec.html"
//     "viewports": ["phone","desktop"], "schemes": ["light","dark"],
//     "wait": 1500, "waitFor": "#reel", "setup": "localStorage.setItem('nooz.onboarded','1')",
//     "sample_data": true, "mask": "circle" }
//
// Writes PNGs to <out>/web/<imagery>/<label>.<viewport>.<scheme>.png and appends manifest entries
// (lane: "web") to <out>/manifest.json. Never upscales; never edits UI pixels.
import { chromium } from 'playwright'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import path from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => {
  if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return a }, []))
const OUT = args.out || 'screenshots'
const targets = JSON.parse(await readFile(args.targets || 'tools/web-targets.json', 'utf8'))

const VIEWPORTS = {
  phone:   { width: 412, height: 915, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  tablet:  { width: 1024, height: 1366, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 2 },
  watch:   { width: 450, height: 450, deviceScaleFactor: 2 },
  figma:   { width: 400, height: 600, deviceScaleFactor: 2 },
}

// Optional tiny static server for a public/ dir (so file:// restrictions don't bite module scripts).
let server, base
if (args.serve) {
  const root = path.resolve(String(args.serve))
  server = createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split('?')[0]))
    if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, 'index.html')
    if (!existsSync(p)) { res.statusCode = 404; return res.end('nope') }
    const ext = path.extname(p).slice(1)
    const types = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml', ttf: 'font/ttf', woff2: 'font/woff2', webmanifest: 'application/manifest+json' }
    res.setHeader('content-type', types[ext] || 'application/octet-stream')
    createReadStream(p).pipe(res)
  }).listen(0)
  await new Promise(r => server.once('listening', r))
  base = `http://127.0.0.1:${server.address().port}`
  console.log('serving', root, 'at', base)
}

const manifestPath = path.join(OUT, 'manifest.json')
const manifest = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : { version: 1, generated: '', entries: [] }
// PW_CHROME=/usr/bin/google-chrome (or "chrome" for the installed channel) when the Playwright
// browser download is blocked, e.g. in a sandboxed container.
const launchOpts = process.env.PW_CHROME
  ? (process.env.PW_CHROME.includes('/') ? { executablePath: process.env.PW_CHROME } : { channel: process.env.PW_CHROME })
  : {}
const browser = await chromium.launch({ ...launchOpts, args: ['--no-sandbox'] })
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

for (const t of targets) {
  for (const vp of t.viewports || ['phone']) {
    for (const scheme of t.schemes || ['light']) {
      const ctx = await browser.newContext({ ...VIEWPORTS[vp], colorScheme: scheme, reducedMotion: 'no-preference' })
      const page = await ctx.newPage()
      const url = t.file ? 'file://' + path.resolve(t.file) : (t.url.startsWith('/') && base ? base + t.url : t.url)
      await page.goto(url, { waitUntil: 'networkidle' })
      if (t.setup) { await page.evaluate(t.setup); await page.reload({ waitUntil: 'networkidle' }) }
      if (t.waitFor) await page.waitForSelector(t.waitFor, { timeout: 15000 }).catch(() => console.warn('  waitFor timed out:', t.waitFor))
      await page.waitForTimeout(t.wait ?? 1200)
      const dir = path.join(OUT, 'web', t.imagery); await mkdir(dir, { recursive: true })
      const file = path.join(dir, `${slug(t.label)}.${vp}.${scheme}.png`)
      await page.screenshot({ path: file, fullPage: !!t.fullPage, type: 'png' })
      const { width, height } = VIEWPORTS[vp]; const dpr = VIEWPORTS[vp].deviceScaleFactor
      const id = `${t.imagery}.${slug(t.label)}.${vp}.${scheme}`
      manifest.entries = manifest.entries.filter(e => e.id !== id)
      manifest.entries.push({ id, imagery: t.imagery, role: t.role || 'feature', lane: 'web', label: t.label, src: file,
        w: width * dpr, h: height * dpr, scheme, viewport: vp, mask: t.mask || null, sample_data: !!t.sample_data,
        source: { repo: t.repo || null, ref: t.ref || null, path: t.file || t.url, tool: 'playwright' }, device: null })
      console.log('  shot', file)
      await ctx.close()
    }
  }
}
manifest.generated = new Date().toISOString()
await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
await browser.close(); server?.close()
console.log('manifest entries:', manifest.entries.length)
