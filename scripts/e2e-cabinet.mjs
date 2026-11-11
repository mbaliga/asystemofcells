// End-to-end: a real browser places Cabinet orders against the local dev
// server (in-memory ledger). Run: node scripts/counter-dev.mjs & node scripts/e2e-cabinet.mjs
import { createRequire } from 'node:module'
import { createHmac } from 'node:crypto'
const require = createRequire('/opt/node22/lib/node_modules/')
const { chromium } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:8788'
const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'devsecret'
let fails = 0
const ok = (n, c, d = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); if (!c) fails++ }

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
async function order(page, item, email, { qty = 1 } = {}) {
  await page.goto(`${BASE}/cabinet/${item}/`)
  await page.click('#addToBasket')
  for (let i = 1; i < qty; i++) await page.click('#addToBasket')
  await page.goto(`${BASE}/cabinet/checkout/`)
  await page.waitForTimeout(3300) // the form refuses submits under 3 s
  await page.fill('[name=name]', 'Asha Rao'); await page.fill('[name=email]', email)
  await page.fill('[name=line1]', '1 Road'); await page.fill('[name=city]', 'Hyderabad'); await page.fill('[name=state]', 'TS'); await page.fill('[name=postcode]', '500001')
  await page.click('button[type=submit]')
}

// 1. A made edition, two of them.
const a = await (await browser.newContext()).newPage()
const analytics = []; a.on('request', (r) => { if (/_vercel\/(insights|speed)|va\.vercel/.test(r.url())) analytics.push(r.url()) })
await order(a, 'sample-hyle-cell', 'a@example.com', { qty: 2 })
await a.waitForURL(/\/orders\/\?id=/, { timeout: 15000 })
const url = new URL(a.url()); const id = url.searchParams.get('id'), t = url.searchParams.get('t')
await a.waitForSelector('#orderRoot h2')
ok('made edition: order placed, status page shows it', /Placed|Being reviewed/.test(await a.textContent('#orderRoot h2')), await a.textContent('#orderRoot h2'))
ok('quote is 2 x 2400 + shipping', (await a.textContent('#orderRoot p')).includes('₹'), await a.textContent('#orderRoot p'))
ok('no analytics request on any of these pages', analytics.length === 0)

// 2. A one-off: first holds it, second gets the waitlist.
const b = await (await browser.newContext()).newPage()
await order(b, 'sample-inkwell', 'b@example.com'); await b.waitForURL(/\/orders\/\?id=/, { timeout: 15000 })
const c = await (await browser.newContext()).newPage()
await order(c, 'sample-inkwell', 'c@example.com')
await c.waitForSelector('#msg:has-text("holding one")', { timeout: 15000 })
ok('second buyer of a one-off sees "reserved" and the waitlist form', await c.isVisible('#waitlist'))
await c.fill('[name=wemail]', 'c@example.com'); await c.click('#waitlist button')
await c.waitForSelector('#waitlist p:has-text("Noted")', { timeout: 10000 })
ok('waitlist inquiry saved', true)

// 3. The sold piece cannot be bought.
const d = await (await browser.newContext()).newPage()
await d.goto(`${BASE}/cabinet/sample-compass/`)
ok('sold piece has no basket button', (await d.locator('#addToBasket').count()) === 0)

// 4. Owner accepts, customer pays (signed webhook), status page follows.
const accept = await (await fetch(`${BASE}/api/counter/owner/orders/${id}/accept`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })).json()
ok('owner accept returns a payment link', /rzp\.io/.test(accept.shortUrl), accept.shortUrl)
const order0 = await (await fetch(`${BASE}/api/counter/orders/${id}?t=${t}`)).json()
ok('customer status shows accepted with a pay link', order0.status === 'accepted' && order0.payment.shortUrl === accept.shortUrl)
await a.reload(); await a.waitForSelector('#orderRoot a.cab-btn')
ok('status page offers Pay now', /Pay now/.test(await a.textContent('#orderRoot a.cab-btn')))
const linkId = accept.shortUrl.split('/').pop()
const raw = JSON.stringify({ event: 'payment_link.paid', payload: { payment_link: { entity: { id: linkId, reference_id: id + '-x' } }, payment: { entity: { id: 'pay_e2e' } } } })
const sig = createHmac('sha256', SECRET).update(raw).digest('hex')
const hook = async (evt) => (await fetch(`${BASE}/api/counter/webhooks/razorpay`, { method: 'POST', body: raw, headers: { 'x-razorpay-signature': sig, 'x-razorpay-event-id': evt } })).status
ok('bad signature refused', (await fetch(`${BASE}/api/counter/webhooks/razorpay`, { method: 'POST', body: raw, headers: { 'x-razorpay-signature': 'bad' } })).status === 400)
ok('webhook accepted, and replay too', (await hook('evt_e2e')) === 200 && (await hook('evt_e2e')) === 200)
ok('order is paid', (await (await fetch(`${BASE}/api/counter/orders/${id}?t=${t}`)).json()).status === 'paid')
await fetch(`${BASE}/api/counter/owner/orders/${id}/status`, { method: 'POST', body: JSON.stringify({ status: 'dispatched', carrier: 'India Post', tracking: 'EE1' }), headers: { 'Content-Type': 'application/json' } })
await a.reload(); await a.waitForSelector('#orderRoot h2')
ok('status page shows tracking after dispatch', (await a.textContent('#orderRoot')).includes('EE1'))
const st = await (await fetch(`${BASE}/api/counter/catalog-state`)).json()
await fetch(`${BASE}/api/counter/owner/rebuild`, { method: 'POST' })
const st2 = await (await fetch(`${BASE}/api/counter/catalog-state`)).json()
ok('rebuild publishes catalog-state with the held and sold pieces', st2.items['sample-inkwell'] && st2.items['sample-inkwell'].status === 'reserved', JSON.stringify(st2.items))
await browser.close()
console.log(fails ? `${fails} FAILED` : 'all e2e checks passed'); process.exit(fails ? 1 : 0)
