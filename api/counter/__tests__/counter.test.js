import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { makeCtx, cabinetBody, printBody, CATALOG } from './helpers.js'
import * as S from '../_service.js'
import { ulid, ulidTime, isUlid, HttpError, rateLimit } from '../_util.js'
import { allowed, canTransition, nextAction } from '../_machine.js'
import { createMemoryLedger, createGithubLedger, LedgerError } from '../_ledger.js'
import { createGiteaLedger } from '../_ledger.gitea.js'
import { verifySignature } from '../_razorpay.js'
import { presignUrl } from '../_storage.js'
import { quotePrint, quoteCabinet, TABLES } from '../_quote.js'
import { quote as refQuote } from '../../../docs/handoff/tools/estimate.mjs'

const rejects = async (p, status, code) => {
  await assert.rejects(p, (e) => e instanceof HttpError && e.status === status && (!code || e.code === code), `expected ${status} ${code}`)
}
const paidEvent = (order, payId = 'pay_1') => ({
  event: 'payment_link.paid',
  payload: { payment_link: { entity: { id: order.payment.linkId, reference_id: order.id, status: 'paid' } }, payment: { entity: { id: payId } } },
})
const getOrder = async (ctx, id) => (await ctx.ledger.readJson(S.orderPath(id))).json

test('ulid: shape, time round trip, ordering', () => {
  const a = ulid(1_700_000_000_000), b = ulid(1_700_000_000_001)
  assert.ok(isUlid(a)); assert.equal(ulidTime(a), 1_700_000_000_000); assert.ok(a.slice(0, 10) <= b.slice(0, 10))
})

test('quote parity: server quotePrint equals the reference estimator quote()', () => {
  for (const tier of ['as-is', 'supports-removed', 'processed']) for (const [massG, printMin, qty, zone] of [[8, 30, 1, 'IN'], [40, 300, 3, 'IN'], [120, 900, 2, 'INTL']]) {
    const est = { massG, printMin, band: 0.2 }
    const ref = refQuote({ est, tier, qty, filament: 'PLA', zone, pricing: TABLES.pricing, tiers: TABLES.tiers, shipping: TABLES.shipping })
    const mine = quotePrint({ est, tier, qty, zone })
    assert.equal(mine.total, ref.total); assert.equal(mine.shipping, ref.shipping); assert.equal(mine.finish, ref.finish)
  }
})

test('quote: cabinet shipping bands and fragile surcharge', () => {
  const q = quoteCabinet({ lines: [{ unitInr: 1800, qty: 1, weightGrams: 400, fragile: true }] })
  assert.equal(q.subtotal, 1800); assert.equal(q.shipping, 110 + 120) // 400 g * 1.15 = 460 g -> the 500 g band (110) + fragile 120
})

test('state machine: print and cabinet paths', () => {
  assert.ok(canTransition('print', 'paid', 'in_production')); assert.ok(!canTransition('cabinet', 'paid', 'in_production'))
  assert.ok(canTransition('cabinet', 'paid', 'dispatched')); assert.ok(canTransition('cabinet', 'placed', 'accepted')); assert.ok(!canTransition('print', 'placed', 'accepted'))
  assert.deepEqual(allowed('print', 'delivered'), ['refunded']); assert.deepEqual(allowed('print', 'rejected'), [])
  assert.equal(nextAction({ kind: 'print', status: 'paid' }), 'make'); assert.equal(nextAction({ kind: 'cabinet', status: 'paid' }), 'pack')
})

test('cabinet order: server recomputes, reserves the one-off, owner accepts, webhook pays, replay is a no-op', async () => {
  const ctx = makeCtx()
  const out = await S.createOrder(ctx, cabinetBody(ctx, [{ item: 'hyle-cell-brass', qty: 2 }, { item: 'inkwell-1962', qty: 1 }], { clientQuote: { total: 1 } }))
  assert.equal(out.status, 201)
  const o = await getOrder(ctx, out.body.id)
  assert.equal(o.quote.subtotal, 2 * 2400 + 1800); assert.equal(o.status, 'placed'); assert.ok(o.quoteDrift > 1)
  assert.ok((await ctx.ledger.readJson('reservations/inkwell-1962.json')).json.orderId === o.id)
  assert.ok(ctx.rec.sent.some((m) => m.kind === 'ntfy') && ctx.rec.sent.some((m) => m.kind === 'mail'))

  const { shortUrl } = await S.ownerAccept(ctx, o.id, {})
  assert.match(shortUrl, /rzp\.io/)
  const accepted = await getOrder(ctx, o.id)
  assert.equal(accepted.status, 'accepted')
  assert.equal((await S.getPublicOrder(ctx, o.id, out.body.token)).payment.shortUrl, shortUrl)

  await S.handleRazorpayEvent(ctx, paidEvent(accepted), 'evt_1')
  await S.handleRazorpayEvent(ctx, paidEvent(accepted), 'evt_1') // replay, same event id
  await S.handleRazorpayEvent(ctx, paidEvent(accepted), 'evt_2') // redelivery under a new id: guarded by status
  const paid = await getOrder(ctx, o.id)
  assert.equal(paid.status, 'paid'); assert.equal(paid.payment.paymentId, 'pay_1')
  const events = (await ctx.ledger.read(S.eventsPath(o.id))).text.split('\n').filter(Boolean).map(JSON.parse)
  assert.equal(events.filter((e) => e.type === 'paid').length, 1)
  assert.equal(ctx.rec.sent.filter((m) => m.kind === 'ntfy' && m.title === 'Paid').length, 1)
  assert.equal((await ctx.ledger.readJson('reservations/inkwell-1962.json')).json.sold, true)

  await S.ownerAdvance(ctx, o.id, { status: 'dispatched', carrier: 'India Post', tracking: 'EE123' })
  const pub = await S.getPublicOrder(ctx, o.id, out.body.token)
  assert.deepEqual(pub.fulfilment, { carrier: 'India Post', tracking: 'EE123' })
  assert.equal(pub.address, undefined); assert.equal(JSON.stringify(pub).includes('Road'), false); assert.equal(JSON.stringify(pub).includes('9999'), false)
})

test('reservation race: two simultaneous checkouts for one curiosity -> one 201, one 409', async () => {
  const ctx = makeCtx()
  const results = await Promise.allSettled([
    S.createOrder(ctx, cabinetBody(ctx, [{ item: 'inkwell-1962', qty: 1 }])),
    S.createOrder(ctx, { ...cabinetBody(ctx, [{ item: 'inkwell-1962', qty: 1 }]), customer: { name: 'B', email: 'b@example.com' } }),
  ])
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1)
  const lost = results.find((r) => r.status === 'rejected').reason
  assert.ok(lost instanceof HttpError && lost.status === 409 && lost.code === 'reserved' && lost.extra.expiresAt)
})

test('expired reservation is taken over; a live one is not', async () => {
  const ctx = makeCtx()
  const first = await S.createOrder(ctx, cabinetBody(ctx, [{ item: 'inkwell-1962', qty: 1 }]))
  await rejects(S.createOrder(ctx, { ...cabinetBody(ctx, [{ item: 'inkwell-1962', qty: 1 }]), customer: { name: 'B', email: 'b@example.com' } }), 409, 'reserved')
  ctx.clock.now += 49 * 3600e3
  const second = await S.createOrder(ctx, { ...cabinetBody(ctx, [{ item: 'inkwell-1962', qty: 1 }]), customer: { name: 'B', email: 'b@example.com' } })
  assert.equal((await ctx.ledger.readJson('reservations/inkwell-1962.json')).json.orderId, second.body.id)
  assert.notEqual(first.body.id, second.body.id)
})

test('a failed order releases what it reserved and its idempotency key', async () => {
  const ctx = makeCtx()
  const body = cabinetBody(ctx, [{ item: 'inkwell-1962', qty: 1 }, { item: 'nope', qty: 1 }])
  await rejects(S.createOrder(ctx, body), 400, 'unknown_item')
  assert.equal(await ctx.ledger.read('reservations/inkwell-1962.json'), null)
  const ok = await S.createOrder(ctx, { ...body, items: [{ item: 'inkwell-1962', qty: 1 }] }) // same key, now valid
  assert.equal(ok.status, 201)
})

test('idempotency: same key returns the original order, not a second one', async () => {
  const ctx = makeCtx()
  const body = cabinetBody(ctx, [{ item: 'hyle-cell-brass', qty: 1 }])
  const a = await S.createOrder(ctx, body)
  const b = await S.createOrder(ctx, body)
  assert.equal(b.body.id, a.body.id); assert.equal(b.body.token, a.body.token); assert.equal(b.body.replay, true)
  assert.equal((await ctx.ledger.list('orders/2026/11')).filter((f) => f.name.endsWith('.json') && !f.name.includes('events')).length, 1)
})

test('forms: honeypot, too-fast and bad input are refused; 5-open-orders cap', async () => {
  const ctx = makeCtx()
  await rejects(S.createOrder(ctx, { ...cabinetBody(ctx, [{ item: 'hyle-cell-brass', qty: 1 }]), website: 'spam' }), 400)
  await rejects(S.createOrder(ctx, { ...cabinetBody(ctx, [{ item: 'hyle-cell-brass', qty: 1 }]), startedAt: ctx.now() - 500 }), 400, 'too_fast')
  await rejects(S.createOrder(ctx, { ...cabinetBody(ctx, [{ item: 'hyle-cell-brass', qty: 1 }]), customer: { name: 'x', email: 'nope' } }), 400)
  await rejects(S.createOrder(ctx, cabinetBody(ctx, [{ item: 'inkwell-1962', qty: 2 }])), 400)
  await rejects(S.createOrder(ctx, cabinetBody(ctx, [{ item: 'hyle-cell-brass', qty: 99 }])), 400)
  for (let i = 0; i < 5; i++) await S.createOrder(ctx, cabinetBody(ctx, [{ item: 'hyle-cell-brass', qty: 1 }]))
  await rejects(S.createOrder(ctx, cabinetBody(ctx, [{ item: 'hyle-cell-brass', qty: 1 }])), 429, 'too_many_open')
})

test('edition cannot oversell; INTL refused for India-only pieces', async () => {
  const ctx = makeCtx({ catalog: async () => ({ ...CATALOG, 'hyle-cell-brass': { ...CATALOG['hyle-cell-brass'], editionSold: 11 } }) })
  await rejects(S.createOrder(ctx, cabinetBody(ctx, [{ item: 'hyle-cell-brass', qty: 2 }])), 409, 'sold_out')
  await rejects(S.createOrder(ctx, { ...cabinetBody(ctx, [{ item: 'inkwell-1962', qty: 1 }]), shipTo: { ...cabinetBody(ctx, []).shipTo, country: 'US' } }), 400, 'no_ship')
})

test('print order: server quote, flags, presigned upload, model attaches, reject deletes the file', async () => {
  const ctx = makeCtx()
  const body = printBody(ctx)
  body.items[0].estimate.manifold = false
  const out = await S.createOrder(ctx, body)
  const o = await getOrder(ctx, out.body.id)
  assert.equal(o.quote.total, quotePrint({ est: { massG: 8, printMin: 30 }, tier: 'processed', qty: 2 }).total)
  assert.deepEqual(o.flags, ['non-manifold'])
  assert.ok(out.body.upload.url.includes(o.items[0].model.storageKey))
  await rejects(S.attachModel(ctx, o.id, out.body.token), 409, 'no_upload')
  await ctx.storage.put(o.items[0].model.storageKey, 999)
  await rejects(S.attachModel(ctx, o.id, out.body.token), 409, 'size_mismatch')
  assert.equal(await ctx.storage.head(o.items[0].model.storageKey), null)
  await ctx.storage.put(o.items[0].model.storageKey, 684)
  await S.attachModel(ctx, o.id, out.body.token)
  assert.equal((await getOrder(ctx, o.id)).status, 'reviewing')

  await rejects(S.ownerAccept(ctx, o.id, { total: o.quote.total + o.quote.bandInr + 1 }), 400, 'reason_required')
  await S.ownerReject(ctx, o.id, { reason: 'Too thin to print.' })
  assert.equal((await getOrder(ctx, o.id)).status, 'rejected')
  assert.equal(await ctx.storage.head(o.items[0].model.storageKey), null)
  await rejects(S.ownerAdvance(ctx, o.id, { status: 'in_production' }), 409, 'bad_state')
})

test('print order: long prints are flagged; bad estimate/tier/type refused', async () => {
  const ctx = makeCtx()
  const b = printBody(ctx); b.items[0].estimate.printMin = 2000
  assert.deepEqual((await getOrder(ctx, (await S.createOrder(ctx, b)).body.id)).flags, ['long-print'])
  for (const mutate of [(i) => (i.estimate.massG = -1), (i) => (i.tier = 'gold'), (i) => (i.model.ext = 'exe'), (i) => (i.filament = 'unobtainium'), (i) => (i.model.sha256 = 'zz')]) {
    const bad = printBody(ctx); mutate(bad.items[0]); await rejects(S.createOrder(ctx, bad), 400)
  }
})

test('print lifecycle to delivered; customer cancel only before payment; wrong token looks like a missing order', async () => {
  const ctx = makeCtx()
  const out = await S.createOrder(ctx, printBody(ctx))
  const id = out.body.id
  await rejects(S.getPublicOrder(ctx, id, 'wrong'), 404); await rejects(S.cancelOrder(ctx, id, 'wrong'), 404)
  await ctx.storage.put((await getOrder(ctx, id)).items[0].model.storageKey, 684); await S.attachModel(ctx, id, out.body.token)
  await S.ownerAccept(ctx, id, {})
  const acc = await getOrder(ctx, id)
  await S.handleRazorpayEvent(ctx, paidEvent(acc), 'e1')
  await rejects(S.cancelOrder(ctx, id, out.body.token), 409, 'bad_state')
  for (const status of ['in_production', 'finishing']) await S.ownerAdvance(ctx, id, { status })
  await rejects(S.ownerAdvance(ctx, id, { status: 'dispatched' }), 400) // carrier required
  await S.ownerAdvance(ctx, id, { status: 'dispatched', carrier: 'Delhivery', tracking: 'D1' })
  await S.ownerAdvance(ctx, id, { status: 'delivered' })
  const pub = await S.getPublicOrder(ctx, id, out.body.token)
  assert.equal(pub.status, 'delivered'); assert.ok(pub.timeline.some((e) => e.status === 'in_production'))
})

test('customer cancel before payment frees the reservation', async () => {
  const ctx = makeCtx()
  const out = await S.createOrder(ctx, cabinetBody(ctx, [{ item: 'inkwell-1962', qty: 1 }]))
  await S.cancelOrder(ctx, out.body.id, out.body.token)
  assert.equal(await ctx.ledger.read('reservations/inkwell-1962.json'), null)
})

test('payment on a closed order is recorded and flagged for refund, never silently dropped', async () => {
  const ctx = makeCtx()
  const out = await S.createOrder(ctx, cabinetBody(ctx, [{ item: 'hyle-cell-brass', qty: 1 }]))
  await S.ownerAccept(ctx, out.body.id, {})
  const acc = await getOrder(ctx, out.body.id)
  await S.cancelOrder(ctx, out.body.id, out.body.token)
  await S.handleRazorpayEvent(ctx, paidEvent(acc), 'late')
  assert.equal((await getOrder(ctx, out.body.id)).status, 'cancelled')
  assert.ok(ctx.rec.sent.some((m) => m.title === 'Payment on a closed order'))
})

test('webhook: events for unknown orders or other link ids are ignored; unrelated events are not handled', async () => {
  const ctx = makeCtx()
  const out = await S.createOrder(ctx, cabinetBody(ctx, [{ item: 'hyle-cell-brass', qty: 1 }]))
  await S.ownerAccept(ctx, out.body.id, {})
  const acc = await getOrder(ctx, out.body.id)
  const wrong = paidEvent(acc); wrong.payload.payment_link.entity.id = 'plink_other'
  assert.equal((await S.handleRazorpayEvent(ctx, wrong, 'x')).handled, false)
  assert.equal((await S.handleRazorpayEvent(ctx, { event: 'payment.captured' }, 'y')).handled, false)
  assert.equal((await getOrder(ctx, out.body.id)).status, 'accepted')
})

test('webhook crash safety: a transition that landed but whose marker did not is finished by the retry, once', async () => {
  const ctx = makeCtx()
  const out = await S.createOrder(ctx, cabinetBody(ctx, [{ item: 'inkwell-1962', qty: 1 }]))
  await S.ownerAccept(ctx, out.body.id, {})
  const acc = await getOrder(ctx, out.body.id)
  // Simulate: order flipped to paid, then the function died before events/marker.
  await ctx.ledger.update(S.orderPath(acc.id), (c) => ({ ...c, status: 'paid', payment: { ...c.payment, status: 'paid', paymentId: 'pay_1' } }))
  await S.handleRazorpayEvent(ctx, paidEvent(acc), 'retry'); await S.handleRazorpayEvent(ctx, paidEvent(acc), 'retry2')
  const events = (await ctx.ledger.read(S.eventsPath(acc.id))).text.split('\n').filter(Boolean).map(JSON.parse)
  assert.equal(events.filter((e) => e.type === 'paid').length, 1)
  assert.equal((await ctx.ledger.readJson('reservations/inkwell-1962.json')).json.sold, true)
})

test('rebuild: expires unpaid accepted orders and unverified placed orders, frees reservations, writes derived files', async () => {
  const ctx = makeCtx()
  const a = await S.createOrder(ctx, cabinetBody(ctx, [{ item: 'inkwell-1962', qty: 1 }]))
  await S.ownerAccept(ctx, a.body.id, {})
  const b = await S.createOrder(ctx, cabinetBody(ctx, [{ item: 'hyle-cell-brass', qty: 1 }]))
  await S.getPublicOrder(ctx, b.body.id, b.body.token, { verify: true })
  const c = await S.createOrder(ctx, cabinetBody(ctx, [{ item: 'hyle-cell-brass', qty: 1 }]))
  ctx.clock.now += 80 * 3600e3
  const r = await S.ownerRebuild(ctx)
  assert.equal((await getOrder(ctx, a.body.id)).status, 'expired')
  assert.equal((await getOrder(ctx, c.body.id)).status, 'expired') // never verified
  assert.equal((await getOrder(ctx, b.body.id)).status, 'placed') // verified, still waiting for the owner
  assert.equal(await ctx.ledger.read('reservations/inkwell-1962.json'), null)
  assert.equal(r.counters.open.cabinet, 1); assert.equal(r.counters.byAction.decide, 1)
  assert.deepEqual((await S.getCatalogState(ctx)).items, {})
})

test('mark sold offline puts the piece in catalog-state and blocks checkout', async () => {
  const ctx = makeCtx()
  await S.ownerMarkSoldOffline(ctx, 'inkwell-1962')
  assert.equal((await S.getCatalogState(ctx)).items['inkwell-1962'].status, 'sold')
  await rejects(S.createOrder(ctx, cabinetBody(ctx, [{ item: 'inkwell-1962', qty: 1 }])), 409, 'sold')
})

test('model retention: 30 days after dispatch the file is deleted once', async () => {
  const ctx = makeCtx()
  const out = await S.createOrder(ctx, printBody(ctx)); const id = out.body.id
  const key = (await getOrder(ctx, id)).items[0].model.storageKey
  await ctx.storage.put(key, 684); await S.attachModel(ctx, id, out.body.token); await S.ownerAccept(ctx, id, {})
  await S.handleRazorpayEvent(ctx, paidEvent(await getOrder(ctx, id)), 'e')
  for (const status of ['in_production', 'finishing']) await S.ownerAdvance(ctx, id, { status })
  await S.ownerAdvance(ctx, id, { status: 'dispatched', carrier: 'DTDC', tracking: 'T' })
  ctx.clock.now += 10 * 86400e3; await S.ownerRebuild(ctx, { skipHook: true }); assert.ok(await ctx.storage.head(key))
  ctx.clock.now += 25 * 86400e3; await S.ownerRebuild(ctx, { skipHook: true }); assert.equal(await ctx.storage.head(key), null)
  assert.ok((await getOrder(ctx, id)).fulfilment.modelDeletedAt)
})

test('inquiries: commission lands, replay returns the same id, attachments presigned only after the write', async () => {
  const ctx = makeCtx()
  const body = { kind: 'commission', idempotencyKey: 'inq-key-0000001', startedAt: ctx.now() - 9000, fields: { name: 'N', email: 'n@example.com', what: 'residential', message: 'A house.' }, attachments: [{ name: 'plot.pdf', bytes: 2000 }] }
  const a = await S.createInquiry(ctx, body)
  assert.equal(a.status, 201); assert.equal(a.body.uploads.length, 1)
  assert.equal((await S.createInquiry(ctx, body)).body.id, a.body.id)
  await rejects(S.createInquiry(ctx, { ...body, idempotencyKey: 'inq-key-0000002', attachments: [{ name: 'x', bytes: 11 * 1024 * 1024 }] }), 400, 'too_large')
  await rejects(S.createInquiry(ctx, { ...body, idempotencyKey: 'inq-key-0000003', kind: 'gossip' }), 400)
  await rejects(S.createInquiry(ctx, { ...body, idempotencyKey: 'inq-key-0000004', fields: { name: 'N' } }), 400)
})

// ---- ledger adapters ----------------------------------------------------------------

test('memory ledger: create is exclusive; update retries a lost race and then gives up', async () => {
  let injected = 0
  const l = createMemoryLedger({ onBeforePut: async (path, sha, files) => {
    if (path === 'x.json' && sha && injected < 2) { injected++; const cur = files.get('x.json'); files.set('x.json', { text: JSON.stringify({ n: 99 }), sha: cur.sha + 'x' }) }
  } })
  await l.create('x.json', { n: 0 })
  await assert.rejects(l.create('x.json', { n: 1 }), (e) => e.code === 'EXISTS')
  const out = await l.update('x.json', (c) => ({ n: c.n + 1 })) // loses twice, wins the third time, on fresh data
  assert.equal(out.n, 100)
  injected = -10
  await assert.rejects(l.update('x.json', (c) => ({ n: c.n + 1 })), (e) => e.code === 'CONFLICT') // keeps losing -> surfaces
})

function fakeGitHub({ conflictCreates = 0, conflictUpdates = 0 } = {}) {
  const files = new Map(); let n = 0; const calls = []
  const fetchImpl = async (url, init = {}) => {
    const u = new URL(url); const method = init.method || 'GET'
    const path = decodeURIComponent(u.pathname.replace(/^.*\/contents\//, '')); calls.push(`${method} ${path}`)
    const json = (status, body) => ({ status, ok: status < 300, json: async () => body })
    const dir = [...files.keys()].filter((k) => k.startsWith(path + '/'))
    if (method === 'GET') {
      if (files.has(path)) { const f = files.get(path); return json(200, { type: 'file', content: Buffer.from(f.text).toString('base64'), sha: f.sha }) }
      if (dir.length) return json(200, [...new Set(dir.map((k) => k.slice(path.length + 1).split('/')[0]))].map((name) => ({ name, path: `${path}/${name}` })))
      return json(404, {})
    }
    const b = JSON.parse(init.body)
    if (method === 'PUT' || method === 'POST') {
      if (!b.sha && conflictCreates > 0) { conflictCreates--; return json(409, {}) }
      if (b.sha && conflictUpdates > 0) { conflictUpdates--; return json(409, {}) }
      const cur = files.get(path)
      if (!b.sha && cur) return json(422, {})
      if (b.sha && (!cur || cur.sha !== b.sha)) return json(409, {})
      const f = { text: Buffer.from(b.content, 'base64').toString(), sha: 's' + ++n }; files.set(path, f); return json(201, { content: { sha: f.sha } })
    }
    if (method === 'DELETE') { files.delete(path); return json(200, {}) }
  }
  return { fetchImpl, files, calls }
}

for (const [name, make] of [
  ['github', (fetchImpl) => createGithubLedger({ repo: 'o/r', token: 't', fetchImpl })],
  ['gitea', (fetchImpl) => createGiteaLedger({ baseUrl: 'https://git.test', repo: 'o/r', token: 't', fetchImpl })],
]) {
  test(`${name} ledger over HTTP: 422 on create-existing is EXISTS, 409 retries, list and remove work`, async () => {
    const fake = fakeGitHub({ conflictCreates: 1, conflictUpdates: 1 })
    const l = make(fake.fetchImpl)
    await l.create('a/b.json', { v: 1 }) // first attempt 409 (branch moved), retried
    await assert.rejects(l.create('a/b.json', { v: 2 }), (e) => e instanceof LedgerError && e.code === 'EXISTS')
    assert.deepEqual((await l.update('a/b.json', (c) => ({ v: c.v + 1 }))), { v: 2 }) // first PUT 409, re-read, retry
    assert.deepEqual((await l.list('a')).map((e) => e.name), ['b.json'])
    assert.equal(await l.read('missing.json'), null)
    await l.remove('a/b.json'); assert.equal(await l.read('a/b.json'), null)
  })
}

test('whole order flow runs over the HTTP ledger adapter, not just the memory one', async () => {
  const fake = fakeGitHub()
  const ctx = makeCtx({ ledger: createGithubLedger({ repo: 'o/r', token: 't', fetchImpl: fake.fetchImpl }) })
  const out = await S.createOrder(ctx, cabinetBody(ctx, [{ item: 'inkwell-1962', qty: 1 }]))
  await rejects(S.createOrder(ctx, { ...cabinetBody(ctx, [{ item: 'inkwell-1962', qty: 1 }]), customer: { name: 'B', email: 'b@example.com' } }), 409, 'reserved')
  await S.ownerAccept(ctx, out.body.id, {})
  await S.handleRazorpayEvent(ctx, paidEvent(await getOrder(ctx, out.body.id)), 'ev')
  assert.equal((await getOrder(ctx, out.body.id)).status, 'paid')
})

// ---- small pieces ---------------------------------------------------------------------

test('razorpay signature: HMAC-SHA256 of the raw body, constant time, rejects wrong/empty', () => {
  const raw = '{"event":"payment_link.paid"}'; const good = createHmac('sha256', 'sec').update(raw).digest('hex')
  assert.ok(verifySignature(raw, good, 'sec')); assert.ok(!verifySignature(raw + ' ', good, 'sec')); assert.ok(!verifySignature(raw, good, 'other')); assert.ok(!verifySignature(raw, '', 'sec')); assert.ok(!verifySignature(raw, good, ''))
})

test('presign: SigV4 query shape, signed checksum header, deterministic for a fixed clock', () => {
  const a = presignUrl({ method: 'PUT', host: 'acct.r2.cloudflarestorage.com', path: '/bkt/orders/x/y.stl', accessKeyId: 'AK', secretAccessKey: 'SK', signedHeaders: { 'content-type': 'model/stl', 'x-amz-checksum-sha256': 'abc=' }, now: new Date('2026-11-05T09:00:00Z') })
  const b = presignUrl({ method: 'PUT', host: 'acct.r2.cloudflarestorage.com', path: '/bkt/orders/x/y.stl', accessKeyId: 'AK', secretAccessKey: 'SK', signedHeaders: { 'content-type': 'model/stl', 'x-amz-checksum-sha256': 'abc=' }, now: new Date('2026-11-05T09:00:00Z') })
  assert.equal(a.url, b.url); assert.match(a.url, /X-Amz-SignedHeaders=content-type%3Bhost%3Bx-amz-checksum-sha256/); assert.match(a.url, /X-Amz-Signature=[0-9a-f]{64}$/); assert.equal(a.expiresAt, '2026-11-05T09:15:00.000Z')
})

test('rate limit: the eleventh write in a minute is refused', () => {
  for (let i = 0; i < 10; i++) rateLimit('t', { perMinute: 10, now: 1000 })
  assert.throws(() => rateLimit('t', { perMinute: 10, now: 1000 }), (e) => e.status === 429)
})
