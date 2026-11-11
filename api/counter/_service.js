// Counter's business logic (08). Every function takes `ctx` so tests run it
// against the in-memory ledger and fakes:
//   ctx = { ledger, storage, ntfy, mail, razorpay, catalog(), siteUrl, now() , deployHook?, fetchImpl? }
import { createHash } from 'node:crypto'
import { HttpError, ulid, ulidTime, isUlid, newToken, safeEqual, str, optStr, int, EMAIL } from './_util.js'
import { LedgerError } from './_ledger.js'
import { canTransition, isPrePaid, releasesReservation, deletesModel, isOpen, nextAction } from './_machine.js'
import { quoteCabinet, quotePrint, driftInr, TABLES } from './_quote.js'
import { MODEL_TYPES } from './_storage.js'

const RESERVATION_MS = 48 * 3600e3
const PAYMENT_MS = 72 * 3600e3
const UNVERIFIED_MS = 24 * 3600e3
const RETAIN_MODEL_MS = 30 * 24 * 3600e3
const MAX_OPEN_PER_EMAIL = 5
const MIN_FORM_MS = 3000
const MARKER_STALE_MS = 60e3
const GHOST_LOCK_MS = 10 * 60e3
const PAY_GRACE_MS = 3600e3

const iso = (ms) => new Date(ms).toISOString()
export const orderPath = (id) => {
  const d = new Date(ulidTime(id))
  return `orders/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${id}.json`
}
export const eventsPath = (id) => orderPath(id).replace(/\.json$/, '.events.jsonl')
const emailKey = (email) => createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 32)

// ---- events -------------------------------------------------------------------

export async function appendEvent(ctx, id, ev) {
  const line = JSON.stringify({ at: iso(ctx.now()), ...ev })
  await ctx.ledger.updateText(eventsPath(id), (t) => (t ? (t.endsWith('\n') ? t : t + '\n') : '') + line + '\n', { create: true })
}

// ---- reservations (cabinet one-offs) ----------------------------------------------

/** Take the lock for a one-off. create-without-sha is the lock; an *expired* lock is taken over with update-with-sha. */
async function reserve(ctx, item, orderId) {
  const path = `reservations/${item}.json`
  const doc = { item, orderId, at: iso(ctx.now()), expiresAt: iso(ctx.now() + RESERVATION_MS), sold: false }
  try {
    await ctx.ledger.create(path, doc)
    return doc
  } catch (e) {
    if (!(e instanceof LedgerError) || e.code !== 'EXISTS') throw e
  }
  let taken = false
  let blocking
  await ctx.ledger.update(path, (cur) => {
    // fn re-runs on every retry: reset, or a lost race would keep the last run's `taken`.
    taken = false; blocking = undefined
    if (!cur || (!cur.sold && Date.parse(cur.expiresAt) <= ctx.now())) { taken = true; return doc }
    blocking = cur
    return undefined // leave it alone
  }, { create: true }) // create:true: a sweep may delete the file between EXISTS and the read
  if (taken) return doc
  throw new HttpError(409, blocking.sold ? 'sold' : 'reserved', blocking.sold ? 'That piece has been sold.' : 'That piece is reserved for someone else.', blocking.sold ? {} : { expiresAt: blocking.expiresAt })
}

async function releaseReservation(ctx, item, orderId) {
  const path = `reservations/${item}.json`
  for (let i = 0; i < 4; i++) {
    const cur = await ctx.ledger.readJson(path)
    if (!cur || cur.json.orderId !== orderId || cur.json.sold) return
    try { await ctx.ledger.remove(path); return } catch (e) { if (!(e instanceof LedgerError) || e.code !== 'CONFLICT') throw e }
  }
}

async function markReservationSold(ctx, item, orderId) {
  let conflict = null
  await ctx.ledger.update(`reservations/${item}.json`, (cur) => {
    conflict = null
    if (cur && cur.orderId !== orderId && !(cur.sold === false && Date.parse(cur.expiresAt) <= ctx.now() && false)) { conflict = cur; return undefined }
    return { ...(cur || { item }), item, orderId, sold: true, expiresAt: null }
  }, { create: true })
  if (conflict) {
    // The piece is held or sold under another order: two people paid for one thing. Never overwrite; say so loudly.
    await appendEvent(ctx, orderId, { type: 'double-sale', item, heldBy: conflict.orderId })
    await ctx.ntfy.publish({ title: 'One piece, two payments', message: `${item}: ${orderId} paid, but the piece is held by ${conflict.orderId}. Refund one.`, priority: 'high' })
  }
}

// ---- forms --------------------------------------------------------------------

function checkForm(ctx, body) {
  if (body.website) throw new HttpError(400, 'invalid', 'That did not look like a person.') // honeypot
  const started = Number(body.startedAt)
  if (!started || ctx.now() - started < MIN_FORM_MS) throw new HttpError(400, 'too_fast', 'Please take a moment and try again.')
}

function parseCustomer(b) {
  const c = b.customer || {}
  return { name: str(c.name, { min: 1, max: 120, label: 'Name' }), email: str(c.email, { min: 3, max: 200, label: 'Email', pattern: EMAIL }).toLowerCase(), phone: optStr(c.phone, { max: 30, label: 'Phone' }) }
}
function parseShipTo(b) {
  const s = b.shipTo || {}
  const country = str(s.country, { min: 2, max: 2, label: 'Country', pattern: /^[A-Za-z]{2}$/ }).toUpperCase()
  return {
    line1: str(s.line1, { min: 1, max: 300, label: 'Address' }), line2: optStr(s.line2, { max: 300, label: 'Address line 2' }) || '',
    city: str(s.city, { min: 1, max: 120, label: 'City' }), state: str(s.state, { min: 1, max: 120, label: 'State' }),
    postcode: str(s.postcode, { min: 1, max: 20, label: 'Postcode' }), country,
  }
}

// ---- orders -------------------------------------------------------------------

async function openOrdersFor(ctx, email) {
  const idx = await ctx.ledger.readJson(`customers/${emailKey(email)}.json`)
  let open = 0
  for (const id of (idx && idx.json.orders) || []) {
    const o = await ctx.ledger.readJson(orderPath(id))
    if (o && isOpen(o.json.status)) open++
  }
  return open
}

async function resolveCabinet(ctx, body, zone) {
  const catalog = await ctx.catalog()
  const state = ((await ctx.ledger.readJson('catalog-state.json')) || { json: { items: {} } }).json.items || {}
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) throw new HttpError(400, 'invalid', 'The cart is empty or too large.')
  const items = []
  for (const line of body.items) {
    const key = str(line.item, { min: 1, max: 80, label: 'Item' })
    const def = catalog[key]
    if (!def || def.status === 'archived') throw new HttpError(400, 'unknown_item', `That item is not in the cabinet.`)
    const qty = int(line.qty, { min: 1, max: 20, label: 'Quantity' })
    if (def.kind === 'curiosity' && qty !== 1) throw new HttpError(400, 'invalid', 'Curiosities are one of one.')
    if (state[key] && state[key].status === 'sold' && def.kind === 'curiosity') throw new HttpError(409, 'sold', 'That piece has been sold.')
    if (def.kind === 'made') {
      const sold = (state[key] && state[key].soldQty) || def.editionSold || 0
      if (def.editionSize != null && qty > def.editionSize - sold) throw new HttpError(409, 'sold_out', 'That edition has sold out.')
    }
    if (zone === 'INTL' && Array.isArray(def.shipsTo) && !def.shipsTo.includes('INTL')) throw new HttpError(400, 'no_ship', 'That piece ships within India only.')
    items.push({ item: key, title: def.title, qty, unitInr: def.priceInr, kind: def.kind, weightGrams: def.weightGrams || 0, fragile: !!def.fragile })
  }
  const quote = quoteCabinet({ lines: items, zone })
  return { items: items.map(({ weightGrams, fragile, ...rest }) => rest), quote, flags: [] }
}

const pick = (v, allowed, dflt) => (allowed.includes(v) ? v : dflt)
function cleanSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  return {
    layerHeight: pick(Number(r.layerHeight), TABLES.pricing.layerHeights, 0.2),
    infillPct: pick(Number(r.infillPct), TABLES.pricing.infillPresets, 15),
    supports: pick(r.supports, ['auto', 'none'], 'auto'),
    filament: pick(r.filament, Object.keys(TABLES.pricing.inrPerGram), 'PLA'),
  }
}

function resolvePrint(ctx, body, zone) {
  const line = Array.isArray(body.items) ? body.items[0] : null
  if (!line || body.items.length !== 1) throw new HttpError(400, 'invalid', 'A print order carries one model.')
  const m = line.model || {}
  const ext = str(m.ext, { max: 4, label: 'File type' }).toLowerCase()
  if (!MODEL_TYPES[ext]) throw new HttpError(400, 'invalid', 'Models must be STL, 3MF or OBJ.')
  const bytes = int(m.bytes, { min: 1, max: 100 * 1024 * 1024, label: 'File size' })
  const sha256 = str(m.sha256, { min: 64, max: 64, label: 'Checksum', pattern: /^[0-9a-f]{64}$/ })
  const e = line.estimate || {}
  const est = {
    massG: Number(e.massG), printMin: Number(e.printMin), band: TABLES.pricing.estimateBand,
  }
  if (!(est.massG > 0.05 && est.massG < 5000) || !(est.printMin > 0.5 && est.printMin < 20000)) throw new HttpError(400, 'invalid', 'The estimate is out of range.')
  const qty = int(line.qty ?? 1, { min: 1, max: 50, label: 'Quantity' })
  const tier = str(line.tier, { max: 30, label: 'Finish' })
  if (!TABLES.tiers.tiers.some((t) => t.id === tier)) throw new HttpError(400, 'invalid', 'Unknown finish.')
  const filament = str(line.filament || 'PLA', { max: 10, label: 'Material' })
  if (!TABLES.pricing.inrPerGram[filament]) throw new HttpError(400, 'invalid', 'Unknown material.')
  // The figures come from the visitor's browser. The owner sees this flag on every print order and checks the file before accepting.
  const flags = ['client-estimate']
  if (e.manifold === false) flags.push('non-manifold')
  if (est.printMin > TABLES.pricing.maxPrintMinutesWithoutReview) flags.push('long-print')
  const quote = quotePrint({ est, tier, qty, filament, zone })
  return {
    items: [{
      model: { name: str(m.name, { min: 1, max: 200, label: 'File name' }), sha256, bytes, ext }, settings: cleanSettings(line.settings),
      estimate: { massG: est.massG, printMin: est.printMin, supports: !!e.supports, manifold: e.manifold !== false }, tier, qty,
      colour: optStr(line.colour, { max: 60, label: 'Colour' }), filament,
    }],
    quote, flags,
  }
}

export async function createOrder(ctx, body) {
  checkForm(ctx, body)
  const kind = body.kind
  if (kind !== 'cabinet' && kind !== 'print') throw new HttpError(400, 'invalid', 'Unknown order kind.')
  const key = str(body.idempotencyKey, { min: 10, max: 64, label: 'Key', pattern: /^[A-Za-z0-9_-]+$/ })
  const customer = parseCustomer(body)
  const shipTo = parseShipTo(body)
  const zone = shipTo.country === 'IN' ? 'IN' : 'INTL'

  // Idempotency: the marker holds the ids we are about to use, so a duplicate
  // submit (or a retry after a crash) gets the original order back.
  const id = ulid(ctx.now())
  const token = newToken()
  const markerPath = `idempotency/order-${key}.json`
  const mine = { orderId: id, token, at: iso(ctx.now()) }
  try {
    await ctx.ledger.create(markerPath, mine)
  } catch (e) {
    if (!(e instanceof LedgerError) || e.code !== 'EXISTS') throw e
    const m = await ctx.ledger.readJson(markerPath)
    const existing = m && (await ctx.ledger.readJson(orderPath(m.json.orderId)))
    if (existing) return replayBody(ctx, existing.json, m.json.token)
    // A marker with no order: either another attempt is mid-flight, or it died. After a minute, take it over.
    if (m && ctx.now() - Date.parse(m.json.at) < MARKER_STALE_MS) throw new HttpError(409, 'in_progress', 'That order is still being placed. Try again in a moment.')
    let took = false
    await ctx.ledger.update(markerPath, (cur) => { took = !!cur && cur.orderId === (m && m.json.orderId) && ctx.now() - Date.parse(cur.at) >= MARKER_STALE_MS; return took ? mine : undefined }, { create: false })
    if (!took) throw new HttpError(409, 'in_progress', 'That order is still being placed. Try again in a moment.')
  }

  const reserved = []
  let committed = false
  try {
    if ((await openOrdersFor(ctx, customer.email)) >= MAX_OPEN_PER_EMAIL) throw new HttpError(429, 'too_many_open', 'There are already several open orders for that email.')
    const resolved = kind === 'cabinet' ? await resolveCabinet(ctx, body, zone) : resolvePrint(ctx, body, zone)
    if (kind === 'cabinet') {
      for (const it of resolved.items) if (it.kind === 'curiosity') { reserved.push(it.item); await reserve(ctx, it.item, id) } // push first: a lost response must still be rolled back
    }
    const flags = [...resolved.flags, ...(zone === 'INTL' ? ['intl'] : [])]
    const drift = driftInr(Number(body.clientQuote && body.clientQuote.total), resolved.quote)
    const order = {
      id, kind, createdAt: iso(ctx.now()), status: 'placed', customer, shipTo, zone, items: resolved.items,
      quote: resolved.quote, accepted: null, payment: null,
      fulfilment: { startedAt: null, finishedAt: null, dispatchedAt: null, carrier: null, tracking: null, deliveredAt: null },
      statusToken: token, customerNote: optStr(body.note, { max: 1000, label: 'Note' }), flags, emailVerified: false,
      quoteDrift: drift > 1 ? drift : 0,
    }
    let upload
    if (kind === 'print') {
      const m = order.items[0].model
      m.storageKey = `orders/${id}/${m.sha256}.${m.ext}`
      upload = await ctx.storage.presignUpload({ key: m.storageKey, maxBytes: m.bytes, contentType: MODEL_TYPES[m.ext], sha256Hex: m.sha256 })
    }
    await ctx.ledger.create(orderPath(id), order)
    committed = true // from here the order exists: never roll back, or a retry would make a second one
    await appendEvent(ctx, id, { type: 'placed', status: 'placed', public: true }).catch(() => {})
    await ctx.ledger.update(`customers/${emailKey(customer.email)}.json`, (cur) => ({ orders: [...((cur && cur.orders) || []), id] }), { create: true }).catch(() => {})

    const statusUrl = `${ctx.siteUrl}/orders/?id=${id}&t=${token}`
    await ctx.ntfy.publish({ title: `New ${kind} order`, message: `${id} · ₹${order.quote.total}${flags.length ? ' · ' + flags.join(', ') : ''}`, click: `asoc-counter://orders/${id}`, tags: kind === 'print' ? 'printer' : 'package' })
    await ctx.mail.send({ to: customer.email, subject: 'Your order is in', text: placedMail(order, statusUrl) })
    return { status: 201, body: { id, statusUrl, token, quote: order.quote, ...(upload ? { upload } : {}) } }
  } catch (e) {
    if (committed) throw e
    // Roll back what this attempt took, and free the idempotency key so the customer can retry.
    for (const item of reserved) await releaseReservation(ctx, item, id).catch(() => {})
    await ctx.ledger.remove(markerPath).catch(() => {})
    throw e
  }
}

function replayBody(ctx, order, token) {
  return { status: 200, body: { id: order.id, statusUrl: `${ctx.siteUrl}/orders/?id=${order.id}&t=${token}`, token, quote: order.quote, replay: true } }
}

async function loadOrder(ctx, id) {
  if (!isUlid(id)) throw new HttpError(404, 'not_found', 'No such order.')
  const r = await ctx.ledger.readJson(orderPath(id))
  if (!r) throw new HttpError(404, 'not_found', 'No such order.')
  return r.json
}
async function loadAuthed(ctx, id, token) {
  const o = await loadOrder(ctx, id)
  if (!token || !safeEqual(token, o.statusToken)) throw new HttpError(404, 'not_found', 'No such order.') // same answer as a missing order
  return o
}

/** The public status page: no address line, no phone, no token. */
export async function getPublicOrder(ctx, id, token, { verify = false } = {}) {
  let o = await loadAuthed(ctx, id, token)
  if (verify && !o.emailVerified) {
    o = await ctx.ledger.update(orderPath(id), (cur) => ({ ...cur, emailVerified: true }))
    await appendEvent(ctx, id, { type: 'emailVerified' })
  }
  const ev = (await ctx.ledger.read(eventsPath(id)))
  const timeline = ev ? ev.text.split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((e) => e.public).map(({ at, status, note }) => ({ at, status, note })) : []
  return {
    id: o.id, kind: o.kind, status: o.status, timeline, quote: o.accepted ? { ...o.quote, total: o.accepted.total } : o.quote, acceptedNote: o.accepted && o.accepted.note || null,
    payment: o.payment && o.status === 'accepted' ? { shortUrl: o.payment.shortUrl } : null,
    fulfilment: { carrier: o.fulfilment.carrier, tracking: o.fulfilment.tracking }, emailVerified: o.emailVerified,
    items: o.items.map((i) => (o.kind === 'print' ? { name: i.model.name, qty: i.qty, tier: i.tier } : { title: i.title, qty: i.qty })),
  }
}

async function finishUnpaid(ctx, o, to, { reason } = {}) {
  // Close the payment link first, so nobody can pay a link for an order we are closing.
  if (o.payment && o.payment.status === 'created') await ctx.razorpay.cancelPaymentLink(o.payment.linkId)
  const next = await ctx.ledger.update(orderPath(o.id), (cur) => {
    if (!canTransition(cur.kind, cur.status, to)) return undefined
    return { ...cur, status: to }
  })
  if (next.status !== to) throw new HttpError(409, 'bad_state', `That order cannot become ${to} from ${next.status}.`)
  if (releasesReservation(to)) for (const it of next.items) if (it.kind === 'curiosity') await releaseReservation(ctx, it.item, o.id)
  if (deletesModel(to) && next.kind === 'print') await ctx.storage.delete(next.items[0].model.storageKey).catch(() => {})
  await appendEvent(ctx, o.id, { type: to, status: to, public: true, ...(reason ? { note: reason } : {}) })
  return next
}

export async function cancelOrder(ctx, id, token) {
  const o = await loadAuthed(ctx, id, token)
  if (!isPrePaid(o.status)) throw new HttpError(409, 'bad_state', 'It is too late to cancel this order. Write to us instead.')
  await finishUnpaid(ctx, o, 'cancelled')
  await ctx.ntfy.publish({ title: 'Order cancelled', message: id, priority: 'low' })
}

/** The browser has PUT the model to the presigned URL; verify it landed and open the order for review. */
export async function attachModel(ctx, id, token) {
  const o = await loadAuthed(ctx, id, token)
  if (o.kind !== 'print') throw new HttpError(400, 'invalid', 'This order has no model.')
  const m = o.items[0].model
  const head = await ctx.storage.head(m.storageKey)
  if (!head) throw new HttpError(409, 'no_upload', 'The model has not arrived yet.')
  if (head.bytes !== m.bytes) {
    await ctx.storage.delete(m.storageKey).catch(() => {})
    throw new HttpError(409, 'size_mismatch', 'The uploaded file is not the size that was declared.')
  }
  const next = await ctx.ledger.update(orderPath(id), (cur) => (cur.status === 'placed' ? { ...cur, status: 'reviewing' } : undefined))
  if (next.status === 'reviewing') await appendEvent(ctx, id, { type: 'reviewing', status: 'reviewing', public: true })
}

// ---- inquiries ----------------------------------------------------------------

export async function createInquiry(ctx, body) {
  checkForm(ctx, body)
  const kind = body.kind
  if (!['commission', 'notify', 'waitlist', 'contact'].includes(kind)) throw new HttpError(400, 'invalid', 'Unknown inquiry kind.')
  const key = str(body.idempotencyKey, { min: 10, max: 64, label: 'Key', pattern: /^[A-Za-z0-9_-]+$/ })
  const id = 'inq_' + ulid(ctx.now())
  const marker = `idempotency/inquiry-${key}.json`
  try { await ctx.ledger.create(marker, { id }) } catch (e) {
    if (!(e instanceof LedgerError) || e.code !== 'EXISTS') throw e
    return { status: 200, body: { id: (await ctx.ledger.readJson(marker)).json.id, replay: true } }
  }
  try {
    const f = body.fields || {}
    const fields = {}
    for (const [k, max] of Object.entries({ name: 120, email: 200, phone: 30, where: 200, what: 60, scale: 300, timeline: 120, budget: 60, message: 4000, item: 80 })) {
      if (f[k] !== undefined && f[k] !== null && f[k] !== '') fields[k] = str(String(f[k]), { max, label: k })
    }
    if (kind !== 'contact' && !fields.email) throw new HttpError(400, 'invalid', 'An email is needed to reply.')
    if (fields.email && !EMAIL.test(fields.email)) throw new HttpError(400, 'invalid', 'Email is not valid.')
    const atts = Array.isArray(body.attachments) ? body.attachments.slice(0, 5) : []
    const total = atts.reduce((s, a) => s + Number(a.bytes || 0), 0)
    if (total > 10 * 1024 * 1024) throw new HttpError(400, 'too_large', 'Attachments are limited to 10 MB in total.')
    const when = new Date(ctx.now())
    const doc = { id, kind, createdAt: iso(ctx.now()), fields, attachments: atts.map((a, n) => ({ name: str(a.name, { max: 200, label: 'Attachment' }), bytes: int(a.bytes, { min: 1, max: 10 * 1024 * 1024 }), storageKey: `inquiries/${id}/${n}` })), status: 'new' }
    await ctx.ledger.create(`inquiries/${when.getUTCFullYear()}/${String(when.getUTCMonth() + 1).padStart(2, '0')}/${id}.json`, doc)
    // Attachments reach the store only after the inquiry is safely in the ledger.
    const uploads = []
    for (const a of doc.attachments) uploads.push({ name: a.name, ...(await ctx.storage.presignUpload({ key: a.storageKey, maxBytes: a.bytes, contentType: 'application/octet-stream' })) })
    await ctx.ntfy.publish({ title: `New ${kind}`, message: id, tags: 'envelope' })
    return { status: 201, body: { id, ...(uploads.length ? { uploads } : {}) } }
  } catch (e) { await ctx.ledger.remove(marker).catch(() => {}); throw e }
}

// ---- catalog state ------------------------------------------------------------

export async function getCatalogState(ctx) {
  const r = await ctx.ledger.readJson('catalog-state.json')
  return r ? r.json : { items: {}, updatedAt: null }
}

// ---- Razorpay webhook ----------------------------------------------------------

/**
 * payment_link.paid -> accepted -> paid. Replay-safe by construction: the
 * transition is guarded by the current status (a second delivery finds the
 * order already paid and changes nothing), and the dedup marker is written
 * *after* the transition, so a crash between the two cannot lose a payment.
 */
export async function handleRazorpayEvent(ctx, event, eventId) {
  if (event.event !== 'payment_link.paid') return { handled: false }
  const marker = `idempotency/rzp-${eventId}.json`
  if (await ctx.ledger.read(marker)) return { handled: true, replay: true }
  const link = event.payload && event.payload.payment_link && event.payload.payment_link.entity
  const pay = event.payload && event.payload.payment && event.payload.payment.entity
  if (!link || typeof link.reference_id !== 'string' || !isUlid(link.reference_id.slice(0, 26))) return { handled: false }
  const orderId = link.reference_id.slice(0, 26)
  const o = await loadOrder(ctx, orderId)
  if (!o.payment || o.payment.linkId !== link.id) {
    // The webhook can beat the ledger write in ownerAccept: ask Razorpay to retry.
    if (['placed', 'reviewing'].includes(o.status)) throw new HttpError(503, 'not_ready', 'Order not ready; retry.')
    // A link we no longer track (lost accept race, crash after creating it): the money is real. Record it, tell the owner.
    await appendEvent(ctx, o.id, { type: 'paid-unknown-link', linkId: link.id, paymentId: pay && pay.id, status: o.status })
    await ctx.ntfy.publish({ title: 'Payment on an unknown link', message: `${o.id} ${link.id}. Refund or reconcile.`, priority: 'high' })
    return { handled: true }
  }
  const next = await ctx.ledger.update(orderPath(o.id), (cur) => {
    if (cur.status === 'accepted') {
      return { ...cur, status: 'paid', payment: { ...cur.payment, status: 'paid', paidAt: iso(ctx.now()), paymentId: pay && pay.id } }
    }
    return undefined
  })
  if (next.status === 'paid' && next.payment.paymentId === (pay && pay.id)) {
    // Idempotent work runs every time; only the notifications are gated, by an atomic append to the events log.
    for (const it of next.items) if (it.kind === 'curiosity') await markReservationSold(ctx, it.item, o.id)
    const needle = `"type":"paid","status":"paid","public":true,"paymentId":"${pay.id}"`
    let won = false
    await ctx.ledger.updateText(eventsPath(o.id), (t) => {
      won = false
      if (t && t.includes(needle)) return undefined
      won = true
      return (t ? (t.endsWith('\n') ? t : t + '\n') : '') + JSON.stringify({ at: iso(ctx.now()), type: 'paid', status: 'paid', public: true, paymentId: pay.id }) + '\n'
    }, { create: true })
    if (won) {
      await ctx.ntfy.publish({ title: 'Paid', message: `${o.id} · ₹${next.accepted ? next.accepted.total : next.quote.total}`, priority: 'high', click: `asoc-counter://orders/${o.id}`, tags: 'moneybag' })
      await ctx.mail.send({ to: next.customer.email, subject: 'Payment received', text: paidMail(next) })
    }
  } else if (next.status !== 'paid') {
    // Money arrived for an order that is no longer payable (expired, cancelled, rejected): the owner refunds.
    await appendEvent(ctx, o.id, { type: 'paid-after-close', paymentId: pay && pay.id, status: next.status })
    await ctx.ntfy.publish({ title: 'Payment on a closed order', message: `${o.id} (${next.status}). Refund from the Razorpay dashboard.`, priority: 'high' })
  }
  try { await ctx.ledger.create(marker, { at: iso(ctx.now()), orderId: o.id }) } catch (e) { if (!(e instanceof LedgerError) || e.code !== 'EXISTS') throw e }
  return { handled: true }
}

// ---- owner --------------------------------------------------------------------

export async function ownerAccept(ctx, id, { total, note } = {}) {
  let o = await loadOrder(ctx, id)
  if (o.status === 'accepted' && o.payment && o.payment.shortUrl) return { shortUrl: o.payment.shortUrl } // a second click is not an error
  if (!canTransition(o.kind, o.status, 'accepted')) throw new HttpError(409, 'bad_state', `Cannot accept an order that is ${o.status}.`)
  const t = total === undefined ? o.quote.total : int(total, { min: 1, max: 10000000, label: 'Total' })
  const noteText = optStr(note, { max: 1000, label: 'Note' })
  if (t > o.quote.total + (o.quote.bandInr || 0) && !noteText) throw new HttpError(400, 'reason_required', 'A total above the quoted band needs a note the customer will see.')

  // The 48h hold ends "without acceptance" (05 §4): accepting must still hold the lock, and extends it to cover payment.
  for (const it of o.items) if (it.kind === 'curiosity') {
    let held = false
    await ctx.ledger.update(`reservations/${it.item}.json`, (cur) => {
      held = !!cur && cur.orderId === id && !cur.sold
      return held ? { ...cur, expiresAt: iso(ctx.now() + PAYMENT_MS + PAY_GRACE_MS) } : undefined
    }, { create: false }).catch((e) => { if (!(e instanceof LedgerError) || e.code !== 'NOT_FOUND') throw e })
    if (!held) throw new HttpError(409, 'reservation_lost', 'This piece is no longer reserved for this order.')
  }

  // One device at a time creates the link: a guarded write claims it, the loser is told to wait.
  let claimed = false
  o = await ctx.ledger.update(orderPath(id), (cur) => {
    claimed = false
    if (!canTransition(cur.kind, cur.status, 'accepted')) return undefined
    if (cur.payment && cur.payment.status === 'creating' && ctx.now() - Date.parse(cur.payment.at) < MARKER_STALE_MS) return undefined
    claimed = true
    return { ...cur, payment: { provider: 'razorpay', status: 'creating', at: iso(ctx.now()) } }
  })
  if (!claimed) {
    if (o.status === 'accepted' && o.payment && o.payment.shortUrl) return { shortUrl: o.payment.shortUrl }
    throw new HttpError(409, 'in_progress', o.status === 'placed' || o.status === 'reviewing' ? 'Another device is accepting this order.' : `Cannot accept an order that is ${o.status}.`)
  }
  let link
  try {
    // reference_id carries the order id as its first 26 characters; the suffix keeps it unique across a retry.
    link = await ctx.razorpay.createPaymentLink({ amountInr: t, orderId: id, referenceId: `${id}-${ctx.now().toString(36).slice(-8)}`, customer: o.customer, expireBy: ctx.now() + PAYMENT_MS, callbackUrl: `${ctx.siteUrl}/orders/?id=${id}&t=${o.statusToken}`, description: `Order ${id}` })
  } catch (e) {
    await ctx.ledger.update(orderPath(id), (cur) => (cur.payment && cur.payment.status === 'creating' ? { ...cur, payment: null } : undefined))
    throw e
  }
  const next = await ctx.ledger.update(orderPath(id), (cur) => {
    if (!canTransition(cur.kind, cur.status, 'accepted') || !cur.payment || cur.payment.status !== 'creating') return undefined
    return { ...cur, status: 'accepted', accepted: { at: iso(ctx.now()), total: t, note: noteText }, payment: { provider: 'razorpay', linkId: link.id, shortUrl: link.shortUrl, status: 'created', expiresAt: iso(ctx.now() + PAYMENT_MS) } }
  })
  if (!next.payment || next.payment.linkId !== link.id) {
    // The order closed (the customer cancelled) while the link was being made.
    await ctx.razorpay.cancelPaymentLink(link.id)
    throw new HttpError(409, 'bad_state', `The order became ${next.status} before it could be accepted.`)
  }
  await appendEvent(ctx, id, { type: 'accepted', status: 'accepted', public: true, ...(noteText ? { note: noteText } : {}) })
  await ctx.mail.send({ to: o.customer.email, subject: 'Your order is accepted — pay to confirm', text: acceptedMail(next, link.shortUrl) })
  return { shortUrl: link.shortUrl }
}

export async function ownerReject(ctx, id, { reason }) {
  const why = str(reason, { min: 1, max: 1000, label: 'Reason' })
  const o = await loadOrder(ctx, id)
  const next = await finishUnpaid(ctx, o, 'rejected', { reason: why })
  await ctx.mail.send({ to: next.customer.email, subject: 'About your order', text: `We cannot take this order on.\n\n${why}\n` })
}

export async function ownerAdvance(ctx, id, { status, carrier, tracking }) {
  const o = await loadOrder(ctx, id)
  if (!['in_production', 'finishing', 'dispatched', 'delivered'].includes(status)) throw new HttpError(400, 'invalid', 'Unknown status.')
  if (!canTransition(o.kind, o.status, status)) throw new HttpError(409, 'bad_state', `Cannot go from ${o.status} to ${status}.`)
  const car = status === 'dispatched' ? str(carrier, { min: 1, max: 80, label: 'Carrier' }) : null
  const trk = status === 'dispatched' ? str(tracking, { min: 1, max: 80, label: 'Tracking' }) : null
  const next = await ctx.ledger.update(orderPath(id), (cur) => {
    if (!canTransition(cur.kind, cur.status, status)) return undefined
    const f = { ...cur.fulfilment }
    if (status === 'in_production') f.startedAt = iso(ctx.now())
    if (status === 'finishing') f.finishedAt = iso(ctx.now())
    if (status === 'dispatched') { f.dispatchedAt = iso(ctx.now()); f.carrier = car; f.tracking = trk }
    if (status === 'delivered') f.deliveredAt = iso(ctx.now())
    return { ...cur, status, fulfilment: f }
  })
  if (next.status !== status) throw new HttpError(409, 'bad_state', 'The order changed under you. Refresh and try again.')
  await appendEvent(ctx, id, { type: status, status, public: true })
  if (status === 'dispatched') await ctx.mail.send({ to: next.customer.email, subject: 'Your order has shipped', text: `It is on its way with ${car}.\nTracking: ${trk}\n\nStatus: ${ctx.siteUrl}/orders/?id=${id}&t=${next.statusToken}\n` })
}

export async function ownerMarkSoldOffline(ctx, item) {
  str(item, { min: 1, max: 80, label: 'Item' })
  let blocked = null
  await ctx.ledger.update(`reservations/${item}.json`, (cur) => {
    blocked = null
    if (cur && !cur.sold && Date.parse(cur.expiresAt) > ctx.now()) { blocked = cur; return undefined }
    return cur && cur.sold ? cur : { item, orderId: 'offline', sold: true, expiresAt: null }
  }, { create: true })
  if (blocked) throw new HttpError(409, 'reserved', `That piece is held for order ${blocked.orderId}. Reject or cancel that order first.`, { expiresAt: blocked.expiresAt })
  await ownerRebuild(ctx, { skipHook: true })
}

async function listOrderFiles(ctx, monthsBack = 14) {
  const out = []
  const cutoff = ctx.now() - monthsBack * 31 * 86400e3
  for (const y of await ctx.ledger.list('orders')) {
    for (const m of await ctx.ledger.list(`orders/${y.name}`)) {
      const monthEnd = Date.UTC(Number(y.name), Number(m.name), 1)
      if (monthEnd < cutoff) continue
      for (const f of await ctx.ledger.list(`orders/${y.name}/${m.name}`)) if (/^[0-9A-Z]{26}\.json$/.test(f.name)) out.push(f.path)
    }
  }
  return out
}

/** The owner's inbox: every order file from the last 14 months, newest first, as light summaries. */
export async function ownerListOrders(ctx, { open = true } = {}) {
  const out = []
  for (const path of await listOrderFiles(ctx)) {
    const o = (await ctx.ledger.readJson(path)).json
    if (open && !isOpen(o.status)) continue
    out.push({
      id: o.id, kind: o.kind, status: o.status, createdAt: o.createdAt, nextAction: nextAction(o),
      customer: { firstName: o.customer.name.split(/\s+/)[0], city: o.shipTo.city, country: o.shipTo.country },
      total: o.accepted ? o.accepted.total : o.quote.total, flags: o.flags, summary: o.kind === 'print' ? o.items[0].model.name : o.items.map((i) => i.title).join(', '),
    })
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** One order in full for the owner (address, items, estimate, events), plus a short-lived model download link. */
export async function ownerGetOrder(ctx, id) {
  const o = await loadOrder(ctx, id)
  const ev = await ctx.ledger.read(eventsPath(id))
  const events = ev ? ev.text.split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []
  let modelUrl = null
  if (o.kind === 'print' && !o.fulfilment.modelDeletedAt && ['reviewing', 'accepted', 'paid', 'in_production', 'finishing', 'placed'].includes(o.status)) {
    const key = o.items[0].model.storageKey
    if (await ctx.storage.head(key)) modelUrl = await ctx.storage.presignDownload(key, 900)
  }
  const { statusToken, ...order } = o // the customer's token is theirs
  return { order, events, modelUrl, nextAction: nextAction(o) }
}

/** Sweep expiries, apply retention, recompute derived files, trigger the deploy hook. */
export async function ownerRebuild(ctx, { skipHook = false } = {}) {
  const now = ctx.now()
  const orders = []
  for (const path of await listOrderFiles(ctx)) {
    let o = (await ctx.ledger.readJson(path)).json
    const expire = async () => {
      try { return await finishUnpaid(ctx, o, 'expired') } catch (e) {
        if (!(e instanceof HttpError) || e.status !== 409) throw e // a webhook paid it meanwhile: keep the fresh state
        return (await ctx.ledger.readJson(path)).json
      }
    }
    if (o.status === 'accepted' && o.payment && Date.parse(o.payment.expiresAt) + PAY_GRACE_MS <= now) o = await expire()
    else if (o.status === 'placed' && !o.emailVerified && now - Date.parse(o.createdAt) > UNVERIFIED_MS) o = await expire()
    if (o.kind === 'print' && o.fulfilment.dispatchedAt && !o.fulfilment.modelDeletedAt && now - Date.parse(o.fulfilment.dispatchedAt) > RETAIN_MODEL_MS) {
      await ctx.storage.delete(o.items[0].model.storageKey).catch(() => {})
      o = await ctx.ledger.update(path, (cur) => ({ ...cur, fulfilment: { ...cur.fulfilment, modelDeletedAt: iso(now) } }))
      await appendEvent(ctx, o.id, { type: 'model-deleted' })
    }
    orders.push(o)
  }
  // Reservations: free the expired, keep the sold.
  const items = {}
  for (const f of await ctx.ledger.list('reservations')) {
    const r = await ctx.ledger.readJson(f.path)
    if (!r) continue
    if (r.json.sold) items[r.json.item] = { status: 'sold' }
    else if (Date.parse(r.json.expiresAt) <= now) await ctx.ledger.remove(f.path).catch(() => {})
    else if (r.json.orderId !== 'offline' && now - Date.parse(r.json.at || 0) > GHOST_LOCK_MS && !(await ctx.ledger.read(orderPath(r.json.orderId)))) await ctx.ledger.remove(f.path).catch(() => {}) // lock from an attempt that never wrote its order
    else items[r.json.item] = { status: 'reserved', reservedUntil: r.json.expiresAt }
  }
  for (const o of orders) if (o.kind === 'cabinet' && ['paid', 'dispatched', 'delivered', 'in_production', 'finishing'].includes(o.status)) {
    for (const it of o.items) if (it.kind === 'made') { const cur = items[it.item] || { status: 'available' }; items[it.item] = { ...cur, soldQty: (cur.soldQty || 0) + it.qty } }
  }
  const counters = { open: { cabinet: 0, print: 0 }, byAction: {}, updatedAt: iso(now) }
  for (const o of orders) if (isOpen(o.status)) {
    counters.open[o.kind]++
    const a = nextAction(o); if (a) counters.byAction[a] = (counters.byAction[a] || 0) + 1
  }
  await ctx.ledger.update('catalog-state.json', () => ({ items, updatedAt: iso(now) }), { create: true })
  await ctx.ledger.update('counters.json', () => counters, { create: true })
  if (!skipHook && ctx.deployHook) await (ctx.fetchImpl || fetch)(ctx.deployHook, { method: 'POST' }).catch(() => {})
  return { orders: orders.length, counters }
}

// ---- mail text ------------------------------------------------------------------

const money = (n) => `₹${n}`
function placedMail(o, url) {
  return `Thank you. Your ${o.kind === 'print' ? 'print' : 'cabinet'} order ${o.id} is in.\n\nTotal (a quote until accepted): ${money(o.quote.total)}\nFollow it, and confirm this email address, here:\n${url}&v=1\n\nWe read every order by hand. If we can take it on, you will get a payment link. Nothing is charged before that.\n`
}
function acceptedMail(o, pay) {
  return `Your order ${o.id} is accepted.\n\nTotal: ${money(o.accepted.total)}\n${o.accepted.note ? `Note: ${o.accepted.note}\n` : ''}Pay here within 72 hours (UPI, cards, net banking):\n${pay}\n`
}
function paidMail(o) { return `Payment received for order ${o.id}: ${money(o.accepted ? o.accepted.total : o.quote.total)}. We will make and pack it now, and write when it ships.\n` }
