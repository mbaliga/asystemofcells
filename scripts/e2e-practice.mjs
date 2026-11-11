// End-to-end for the Practice wing in a real browser. Run: node scripts/counter-dev.mjs & node scripts/e2e-practice.mjs
import { createRequire } from 'node:module'
const require = createRequire('/opt/node22/lib/node_modules/')
const { chromium } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:8788'
let fails = 0
const ok = (n, c, d = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); if (!c) fails++ }
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, acceptDownloads: true })
const page = await ctx.newPage()
const errors = [], reqs = [], four04 = []
page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) }); page.on('request', (r) => reqs.push(r.url())); page.on('response', (r) => { if (r.status() === 404 && !/_vercel\/insights/.test(r.url())) four04.push(r.url()) })

// landing and hub
await page.goto(`${BASE}/architecture/`)
ok('landing renders and lists no pending work', /Practice/.test(await page.textContent('h1')) && !/Work 1, to be added/.test(await page.content()))
await page.goto(`${BASE}/architecture/tools/`)
ok('hub lists the four tools', (await page.locator('.arch-hubs li').count()) === 5)

// sun (from here on: only the quiet tool pages, which must carry no analytics)
reqs.length = 0
await page.goto(`${BASE}/architecture/tools/sun/`)
await page.fill('#date', '2026-12-21'); await page.fill('#time', '720'); await page.locator('#time').dispatchEvent('input')
await page.waitForFunction(() => /azimuth/.test(document.getElementById('readout').textContent))
const ro = await page.textContent('#readout'); const az = Number(/azimuth ([\d.]+)/.exec(ro)[1]), el = Number(/elevation ([\d.]+)/.exec(ro)[1])
ok('December solstice, 12:00 IST in Hyderabad: sun is south and about 47 to 49 degrees up', az > 160 && az < 200 && el > 44 && el < 50, ro)
ok('sun-path diagram has curves and a sun mark', (await page.locator('#diagram path').count()) >= 5)
ok('shadow polygon drawn', (await page.locator('#plan polygon').count()) >= 2)
await page.check('#range'); ok('09:00 to 15:00 range adds shadows', (await page.locator('#plan polygon').count()) >= 6)
const dl = page.waitForEvent('download'); await page.click('#csv'); const csv = await dl; ok('CSV downloads', /sun-.*\.csv$/.test(csv.suggestedFilename()))

// wind
await page.goto(`${BASE}/architecture/tools/wind/`)
await page.waitForFunction(() => document.getElementById('rose-note').textContent.length > 10)
ok('wind rose note names a prevailing sector', /most often from the [NESW]+/.test(await page.textContent('#rose-note')), await page.textContent('#rose-note'))
ok('four faces tabulated', (await page.locator('#faces tr').count()) === 4)
await page.check('#open-front'); await page.check('#open-back')
ok('front and back openings are side faces for a west wind, and the page says so', /No openings are marked on the windward or leeward/.test(await page.textContent('#through')))
await page.check('#open-left'); await page.check('#open-right')
ok('left (windward) and right (leeward) openings make a through-path', /through-path from the windward face/.test(await page.textContent('#through')), await page.textContent('#through'))

// vaastu
await page.goto(`${BASE}/architecture/tools/vaastu/`)
await page.selectOption('#func', 'prayer')
await page.locator('#grid g[role=button]').nth(8).click() // row 0, col 8: the NE corner
ok('prayer in the NE corner: the tradition places it in Ishanya', /Ishanya/.test(await page.textContent('#report')), await page.textContent('#report'))
await page.selectOption('#eside', 'N'); await page.fill('#eidx', '3'); await page.locator('#eidx').dispatchEvent('input')
ok('entrance N3 favoured', /favours/.test(await page.textContent('#report')))
ok('no forbidden words on the page', !/dosha|inauspicious|bad luck|curse/i.test(await page.textContent('body')))
ok('the ask link carries the plan', /commission\/\?plan=/.test(await page.getAttribute('#ask', 'href')))

// tropical
await page.goto(`${BASE}/architecture/tools/tropical/`)
await page.waitForFunction(() => document.getElementById('totals').textContent.includes('H1'))
const tot = await page.textContent('#totals'); ok('Hyderabad Mahoney totals', /H1 5/.test(tot) && /A1 7/.test(tot), tot)
ok('shading table has overheated months', (await page.locator('#shade tr').count()) >= 1)
await page.fill('#wall', '270'); await page.locator('#wall').dispatchEvent('input')

// commission (against the dev ledger)
await page.goto(`${BASE}/architecture/commission/`)
await page.waitForTimeout(3300)
await page.fill('[name=name]', 'N'); await page.fill('[name=email]', 'n@example.com'); await page.fill('[name=where]', 'Hyderabad'); await page.fill('[name=message]', 'A house.')
await page.setInputFiles('#filesInput', { name: 'plot.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') })
await page.click('button[type=submit]')
await page.waitForSelector('#done:not([hidden])', { timeout: 15000 })
ok('commission inquiry accepted', true)

ok('no analytics on any tool or form', !reqs.some((u) => /_vercel\/(insights|speed)|va\.vercel/.test(u)))
ok('no page errors', errors.filter((e) => !/404/.test(e)).length === 0, errors.slice(0, 3).join(' | '))
ok('no 404s', four04.length === 0, four04.join(' '))
await browser.close()
console.log(fails ? `${fails} FAILED` : 'all practice e2e checks passed'); process.exit(fails ? 1 : 0)
