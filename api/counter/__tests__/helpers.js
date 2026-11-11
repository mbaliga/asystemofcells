import { createMemoryLedger } from '../_ledger.js'
import { createMemoryStorage } from '../_storage.js'
import { createRecorder } from '../_notify.js'
import { createFakeRazorpay } from '../_razorpay.js'

export const CATALOG = {
  'hyle-cell-brass': { title: 'Hyle cell, brass', kind: 'made', status: 'available', priceInr: 2400, weightGrams: 120, fragile: false, editionSize: 12, editionSold: 3, shipsTo: ['IN', 'INTL'] },
  'inkwell-1962': { title: 'Glass inkwell, 1962', kind: 'curiosity', status: 'available', priceInr: 1800, weightGrams: 400, fragile: true, shipsTo: ['IN'] },
}

export function makeCtx(over = {}) {
  const t = { now: Date.parse('2026-11-05T09:00:00Z') }
  const rec = createRecorder()
  const c = {
    ledger: createMemoryLedger(), storage: createMemoryStorage(), ntfy: rec, mail: rec, rec, razorpay: createFakeRazorpay(),
    catalog: async () => CATALOG, siteUrl: 'https://example.test', now: () => t.now, clock: t, ...over,
  }
  return c
}

let n = 0
export const customer = (email = 'a@example.com') => ({ name: 'Asha Rao', email, phone: '+919999999999' })
export const shipTo = (country = 'IN') => ({ line1: '1 Road', city: 'Hyderabad', state: 'TS', postcode: '500001', country })
export function cabinetBody(ctx, items, extra = {}) {
  return { kind: 'cabinet', idempotencyKey: `key-cabinet-${++n}-aaaaaaaa`, startedAt: ctx.now() - 10000, customer: customer(), shipTo: shipTo(), items, ...extra }
}
export function printBody(ctx, extra = {}) {
  return {
    kind: 'print', idempotencyKey: `key-print-${++n}-aaaaaaaaaa`, startedAt: ctx.now() - 10000, customer: customer(), shipTo: shipTo(),
    items: [{ model: { name: 'cube.stl', ext: 'stl', bytes: 684, sha256: 'a'.repeat(64) }, settings: { layerHeight: 0.2 }, estimate: { massG: 8, printMin: 30, supports: false, manifold: true }, tier: 'processed', qty: 2, colour: 'Black', filament: 'PLA' }],
    ...extra,
  }
}
