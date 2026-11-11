// End-to-end: a real browser drops an STL on the slicer, sees the estimate and quote, and orders.
// Run: node scripts/counter-dev.mjs & node scripts/e2e-prints.mjs
import { createRequire } from 'node:module'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const require = createRequire('/opt/node22/lib/node_modules/')
const { chromium } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:8788'
let fails = 0
const ok = (n, c, d = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); if (!c) fails++ }

function cubeSTL(s) { // binary STL, 12 triangles, outward normals
  const v = [[0,0,0],[s,0,0],[s,s,0],[0,s,0],[0,0,s],[s,0,s],[s,s,s],[0,s,s]]
  const q = [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]
  const tris = []; for (const [a,b,c,d] of q) tris.push([a,b,c], [a,c,d])
  const buf = Buffer.alloc(84 + tris.length * 50); buf.writeUInt32LE(tris.length, 80)
  tris.forEach((t, i) => t.forEach((vi, k) => v[vi].forEach((x, j) => buf.writeFloatLE(x, 84 + i * 50 + 12 + k * 12 + j * 4))))
  return buf
}
const dir = mkdtempSync(join(tmpdir(), 'stl-'))
const cube = join(dir, 'cube20.stl'); writeFileSync(cube, cubeSTL(20))
const big = join(dir, 'big.stl'); writeFileSync(big, cubeSTL(250))
const near = join(dir, 'near.stl'); writeFileSync(near, cubeSTL(190))

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage()
const reqs = []; page.on('request', (r) => reqs.push(r.url()))
page.on('pageerror', (e) => console.log('pageerror', e.message))
await page.goto(`${BASE}/prints/slicer/`)
ok('before a file: three.js and the Worker are not loaded', !reqs.some((u) => /three|slicer\.worker|plate/i.test(u)), reqs.filter((u) => /\.js/.test(u)).map((u) => u.split('/').pop()).join(' '))
ok('app is hidden until a file is chosen', await page.locator('#app').isHidden())
ok('no analytics script on the slicer', !reqs.some((u) => /_vercel\/(insights|speed)|va\.vercel/.test(u)))

await page.setInputFiles('#file', cube)
await page.waitForSelector('#facts:has-text("About")', { timeout: 20000 })
ok('after the file: heavy modules loaded', reqs.some((u) => /plate|slicer-app|three/i.test(u)))
ok('20 mm cube fits the plate', /Fits the plate/.test(await page.textContent('#fits')), await page.textContent('#fits'))
const facts = await page.textContent('#facts')
const g = Number(/About ([\d.]+) g/.exec(facts)[1]); ok('cube mass is in the reference test band (3 to 10 g; the reference gives 3.6 g, real slices 5 to 9 g: calibration)', g > 3 && g < 10, facts)
ok('triangle count and size shown', /12 triangles/.test(await page.textContent('#tris')) && /20\.0 × 20\.0 × 20\.0/.test(await page.textContent('#tris')), await page.textContent('#tris'))
await page.waitForSelector('#quote .total')
const q1 = await page.textContent('#quote .total')
await page.check('input[value=processed]'); await page.fill('#qty', '2')
await page.waitForTimeout(200)
const q2 = await page.textContent('#quote .total')
ok('processed x2 raises the quote', Number(q2.replace(/[^\d]/g, '')) > Number(q1.replace(/[^\d]/g, '')), `${q1} -> ${q2}`)
ok('the band note is shown', /up to 20 %/.test(await page.textContent('#bandNote')), await page.textContent('#bandNote'))
const webgl = await page.evaluate(() => !document.getElementById('plate').hidden)
console.log('INFO  3D canvas ' + (webgl ? 'shown' : 'replaced by the no-WebGL sentence'))

// too big: grey, not fitting, offers nothing it cannot do
await page.setInputFiles('#file', big)
await page.waitForSelector('#fits[data-ok="0"]', { timeout: 20000 })
ok('a 250 mm cube does not fit and says so', /Does not fit/.test(await page.textContent('#fits')))
ok('scale-to-fit is not offered for a 250 mm cube (needs a 28 % shrink)', await page.locator('#fitBtn').isHidden())
await page.setInputFiles('#file', near); await page.waitForSelector('#fitBtn:not([hidden])', { timeout: 20000 })
ok('a 190 mm cube offers scale-to-fit, and it then fits', true)
await page.click('#fitBtn'); await page.waitForSelector('#fits[data-ok="1"]', { timeout: 20000 })
await page.setInputFiles('#file', cube); await page.waitForSelector('#fits[data-ok="1"]', { timeout: 20000 }); await page.waitForSelector('#facts:has-text("About")')

const dl = page.waitForEvent('download'); await page.click('#dlBrief'); const brief = await dl
ok('print-brief.json downloads', brief.suggestedFilename() === 'print-brief.json')

// order
await page.waitForTimeout(3300)
await page.fill('[name=name]', 'Asha Rao'); await page.fill('[name=email]', 'p@example.com'); await page.fill('[name=line1]', '1 Road')
await page.fill('[name=city]', 'Hyderabad'); await page.fill('[name=state]', 'TS'); await page.fill('[name=postcode]', '500001')
await page.click('#orderForm button[type=submit]')
await page.waitForURL(/\/orders\/\?id=/, { timeout: 20000 })
const u = new URL(page.url()), id = u.searchParams.get('id'), t = u.searchParams.get('t')
await page.waitForSelector('#orderRoot h2')
ok('order placed; model attached; the order is under review', /Being reviewed/.test(await page.textContent('#orderRoot h2')), await page.textContent('#orderRoot h2'))
const acc = await (await fetch(`${BASE}/api/counter/owner/orders/${id}/accept`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })).json()
ok('owner accepts and a link is made', /rzp\.io/.test(acc.shortUrl))
await browser.close()
console.log(fails ? `${fails} FAILED` : 'all prints e2e checks passed'); process.exit(fails ? 1 : 0)
