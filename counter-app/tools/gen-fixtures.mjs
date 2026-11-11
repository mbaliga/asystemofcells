#!/usr/bin/env node
// Writes the parity fixtures the Kotlin :core tests check against, from the REAL server code in api/counter/.
// Run from the asystemofcells repo root:  node counter-app/tools/gen-fixtures.mjs
// (When this app lives in its own repo, vendor api/counter/_machine.js, _quote.js and data/*.json beside this script.)
import { writeFileSync } from 'node:fs'
import { allowed, STATES, nextAction } from '../../api/counter/_machine.js'
import { quotePrint, quoteCabinet } from '../../api/counter/_quote.js'
import { makeCtx, cabinetBody, printBody } from '../../api/counter/__tests__/helpers.js'
import * as S from '../../api/counter/_service.js'

const out = 'counter-app/core/src/test/resources/'
const machine = {}
for (const kind of ['print', 'cabinet']) { machine[kind] = {}; for (const s of STATES) machine[kind][s] = allowed(kind, s) }
writeFileSync(out + 'machine.json', JSON.stringify({ states: STATES, machine, nextAction: Object.fromEntries(['print', 'cabinet'].flatMap((k) => STATES.map((s) => [`${k}:${s}`, nextAction({ kind: k, status: s })]))) }, null, 1))

const prints = []
for (const tier of ['as-is', 'supports-removed', 'processed']) for (const filament of ['PLA', 'PETG']) for (const zone of ['IN', 'INTL']) for (const [massG, printMin, qty] of [[0.5, 5, 1], [8, 30, 1], [8, 30, 2], [40, 300, 3], [120, 900, 2], [600, 3000, 1]]) {
  const est = { massG, printMin, band: 0.2 }
  prints.push({ input: { est, tier, qty, filament, zone }, expect: quotePrint({ est, tier, qty, filament, zone }) })
}
const cabinet = [
  { lines: [{ unitInr: 2400, qty: 2, weightGrams: 120, fragile: false }], zone: 'IN' },
  { lines: [{ unitInr: 1800, qty: 1, weightGrams: 400, fragile: true }], zone: 'IN' },
  { lines: [{ unitInr: 3200, qty: 1, weightGrams: 250, fragile: false }, { unitInr: 2400, qty: 1, weightGrams: 120, fragile: false }], zone: 'INTL' },
  { lines: [{ unitInr: 6000, qty: 1, weightGrams: 900, fragile: false }], zone: 'IN' },
].map((input) => ({ input, expect: quoteCabinet(input) }))
writeFileSync(out + 'quotes.json', JSON.stringify({ prints, cabinet }, null, 1))

// A real owner list and detail, produced by the service itself.
const ctx = makeCtx()
const c = await S.createOrder(ctx, cabinetBody(ctx, [{ item: 'hyle-cell-brass', qty: 2 }, { item: 'inkwell-1962', qty: 1 }]))
const p = await S.createOrder(ctx, printBody(ctx)); const po = (await ctx.ledger.readJson(S.orderPath(p.body.id))).json
await ctx.storage.put(po.items[0].model.storageKey, 684); await S.attachModel(ctx, p.body.id, p.body.token)
await S.ownerAccept(ctx, c.body.id, {})
writeFileSync(out + 'owner-orders.json', JSON.stringify({ orders: await S.ownerListOrders(ctx) }, null, 1))
writeFileSync(out + 'owner-order-print.json', JSON.stringify(await S.ownerGetOrder(ctx, p.body.id), null, 1))
writeFileSync(out + 'owner-order-cabinet.json', JSON.stringify(await S.ownerGetOrder(ctx, c.body.id), null, 1))
console.log('fixtures written:', prints.length, 'print quotes,', cabinet.length, 'cabinet quotes')
