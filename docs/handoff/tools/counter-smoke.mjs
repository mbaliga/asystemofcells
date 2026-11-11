#!/usr/bin/env node
// Live smoke test for Counter (08 §9): places a ₹1 test order on the LIVE ledger,
// accepts it through the owner endpoint and prints the Razorpay link for the owner to pay.
//
//   COUNTER_BASE=https://asystemofcells.com COUNTER_OWNER_TOKEN=... node docs/handoff/tools/counter-smoke.mjs
//
// It needs a catalogue item priced at ₹1 (add a draft item "smoke-test" with price 1 and
// shipsTo IN, weight 1 g) so the quote is real. It never prints the owner token.
const BASE = (process.env.COUNTER_BASE || '').replace(/\/$/, '')
const TOKEN = process.env.COUNTER_OWNER_TOKEN
const ITEM = process.env.SMOKE_ITEM || 'smoke-test'
const EMAIL = process.env.SMOKE_EMAIL
if (!BASE || !TOKEN || !EMAIL) { console.error('Set COUNTER_BASE, COUNTER_OWNER_TOKEN and SMOKE_EMAIL.'); process.exit(2) }

const call = async (path, init = {}) => {
  const res = await fetch(BASE + path, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}) } })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) { console.error(`${init.method || 'GET'} ${path} -> ${res.status}`, body.error || body); process.exit(1) }
  return body
}
const key = 'smoke-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
console.log('1. placing order…')
const placed = await call('/api/counter/orders', { method: 'POST', body: JSON.stringify({
  kind: 'cabinet', idempotencyKey: key, startedAt: Date.now() - 5000,
  customer: { name: 'Smoke Test', email: EMAIL }, shipTo: { line1: '1 Test Road', city: 'Hyderabad', state: 'TS', postcode: '500001', country: 'IN' },
  items: [{ item: ITEM, qty: 1 }],
}) })
console.log('   order', placed.id, 'quote', placed.quote.total)
console.log('2. same key again must replay…')
const again = await call('/api/counter/orders', { method: 'POST', body: JSON.stringify({ kind: 'cabinet', idempotencyKey: key, startedAt: Date.now() - 5000, customer: { name: 'Smoke Test', email: EMAIL }, shipTo: { line1: '1 Test Road', city: 'Hyderabad', state: 'TS', postcode: '500001', country: 'IN' }, items: [{ item: ITEM, qty: 1 }] }) })
if (again.id !== placed.id) { console.error('   FAIL: replay made a second order'); process.exit(1) }
console.log('3. accepting through the owner endpoint…')
const acc = await call(`/api/counter/owner/orders/${placed.id}/accept`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: '{}' })
console.log('4. pay this link (UPI is fine) and watch the owner app / ntfy for the "Paid" push:\n   ' + acc.shortUrl)
console.log('5. status page:', placed.statusUrl)
