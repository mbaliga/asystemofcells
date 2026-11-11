// Pricing, shared by the page (a preview) and the Counter function (the
// authoritative number). Pure; the tables come in as arguments.
// OWNER: every number in data/*.json is a placeholder until calibrated.
import pricingJson from '../../data/pricing.prints.json' with { type: 'json' }
import tiersJson from '../../data/finish-tiers.json' with { type: 'json' }
import shippingJson from '../../data/shipping.json' with { type: 'json' }

export const TABLES = { pricing: pricingJson, tiers: tiersJson, shipping: shippingJson }
const r2 = (x) => Math.round(x * 100) / 100

/** Shipping for a parcel of `grams` of goods. packagingAllowancePct is added before banding. */
export function shippingFor({ grams, zone = 'IN', fragile = false, subtotal = 0, shipping = TABLES.shipping, boxGrams = 0 }) {
  const z = shipping.zones[zone]
  if (!z) throw new Error('unknown zone ' + zone)
  const parcel = (grams + boxGrams) * (1 + shipping.packagingAllowancePct / 100)
  const band = z.bands.find((b) => parcel <= b.maxGrams)
  const over = !band // heavier than the table: owner prices by hand
  const b = band || z.bands[z.bands.length - 1]
  let inr = b.inr + (fragile ? shipping.fragileSurchargeInr : 0)
  const free = shipping.freeShippingOverInr[zone]
  if (free != null && subtotal >= free) inr = 0
  return { inr, grams: Math.round(parcel), zone, overTable: over }
}

/** A cabinet cart: lines are { unitInr, qty, weightGrams, fragile }. */
export function quoteCabinet({ lines, zone = 'IN', shipping = TABLES.shipping }) {
  const subtotal = lines.reduce((s, l) => s + l.unitInr * l.qty, 0)
  const grams = lines.reduce((s, l) => s + (l.weightGrams || 0) * l.qty, 0)
  const fragile = lines.some((l) => l.fragile)
  const ship = shippingFor({ grams, zone, fragile, subtotal, shipping })
  return {
    subtotal, finish: 0, packaging: 0, shipping: ship.inr, total: subtotal + ship.inr,
    bandInr: 0, currency: 'INR', zone, grams: ship.grams, overTable: ship.overTable,
  }
}

/** A print: est = { massG, printMin, band }. Same formulae as docs/handoff/tools/estimate.mjs. */
export function quotePrint({ est, tier, qty = 1, filament = 'PLA', zone = 'IN', fragile = false, pricing = TABLES.pricing, tiers = TABLES.tiers, shipping = TABLES.shipping }) {
  const t = tiers.tiers.find((x) => x.id === tier)
  if (!t) throw new Error('unknown tier ' + tier)
  const material = est.massG * (pricing.inrPerGram[filament] ?? pricing.inrPerGram.PLA)
  const machine = (est.printMin / 60) * pricing.inrPerHour
  const basePer = Math.max(pricing.minimumInr, material + machine)
  const base = basePer * qty
  const finish = base * (t.multiplier - 1) + t.adderInrPerPart * qty
  const packaging = pricing.packagingInr
  const ship = shippingFor({ grams: est.massG * qty, boxGrams: pricing.boxGrams, zone, fragile, subtotal: base + finish, shipping })
  const total = Math.round(base + finish + packaging + ship.inr)
  return {
    material: r2(material * qty), machine: r2(machine * qty), subtotal: r2(base), finish: r2(finish),
    packaging, shipping: ship.inr, total, bandInr: Math.round(total * (est.band ?? pricing.estimateBand)),
    currency: 'INR', zone, grams: ship.grams, overTable: ship.overTable,
  }
}

/** Server accepts the client's figure only if it is within ₹1 of its own; otherwise the server's wins. */
export const driftInr = (client, server) => Math.abs((client ?? 0) - server.total)
